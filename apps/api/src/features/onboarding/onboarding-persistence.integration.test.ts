import { afterAll, beforeAll, describe, expect, test } from 'bun:test'
import { generateEntityId } from '@fifilo/core/primitives'
import { db } from '@fifilo/infra-database/client'
import { financialOnboardingProgress, organizations, users } from '@fifilo/infra-database/schema'
import { withActorWorkspaceTransactionOn } from '@fifilo/infra-database/workspace'
import { inArray, sql } from 'drizzle-orm'

import { requirePostgres } from '../../test/require-postgres'
import { createFinancialOnboardingProgressRepository } from './onboarding-persistence'

const ORGANIZATION_A = `test_onboarding_org_a_${generateEntityId()}`
const ORGANIZATION_B = `test_onboarding_org_b_${generateEntityId()}`
const USER_A = `test_onboarding_user_a_${generateEntityId()}`
const USER_B = `test_onboarding_user_b_${generateEntityId()}`
const repository = createFinancialOnboardingProgressRepository()

beforeAll(async () => {
  await requirePostgres()
  await db.insert(organizations).values([
    { id: ORGANIZATION_A, name: 'Onboarding A', slug: `${ORGANIZATION_A}-slug` },
    { id: ORGANIZATION_B, name: 'Onboarding B', slug: `${ORGANIZATION_B}-slug` },
  ])
  await db.insert(users).values([
    { email: `${USER_A}@fifilo.local`, emailVerified: true, id: USER_A, name: 'Onboarding A' },
    { email: `${USER_B}@fifilo.local`, emailVerified: true, id: USER_B, name: 'Onboarding B' },
  ])
  await withActorWorkspaceTransactionOn(db, ORGANIZATION_A, USER_A, (tx) =>
    tx
      .insert(financialOnboardingProgress)
      .values({ organizationId: ORGANIZATION_A, userId: USER_A }),
  )
  await withActorWorkspaceTransactionOn(db, ORGANIZATION_B, USER_B, (tx) =>
    tx
      .insert(financialOnboardingProgress)
      .values({ organizationId: ORGANIZATION_B, userId: USER_B }),
  )
})

afterAll(async () => {
  await db.delete(organizations).where(inArray(organizations.id, [ORGANIZATION_A, ORGANIZATION_B]))
  await db.delete(users).where(inArray(users.id, [USER_A, USER_B]))
})

describe('financial onboarding persistence', () => {
  test('reads only the actor progress in the active organization', async () => {
    expect(await repository.findByUser(ORGANIZATION_A, USER_A)).toMatchObject({
      organizationId: ORGANIZATION_A,
    })
    expect(await repository.findByUser(ORGANIZATION_B, USER_A)).toBeNull()
    expect(await repository.findByUser(ORGANIZATION_A, USER_B)).toBeNull()
  })

  test('ensure creates a missing row and never revives a dismissal', async () => {
    // BUG-003: the creation hook is best effort, so this is what actually
    // guarantees the row — and it must not undo a deferral while doing it.
    // Inside the actor context: without it the policy hides the row and the
    // delete silently removes nothing.
    await withActorWorkspaceTransactionOn(db, ORGANIZATION_A, USER_A, (tx) =>
      tx.execute(
        sql`delete from financial_onboarding_progress where organization_id = ${ORGANIZATION_A}`,
      ),
    )
    expect(await repository.findByUser(ORGANIZATION_A, USER_A)).toBeNull()

    await repository.ensure(ORGANIZATION_A, USER_A)
    expect(await repository.findByUser(ORGANIZATION_A, USER_A)).toMatchObject({
      dismissedAt: null,
      organizationId: ORGANIZATION_A,
    })

    await repository.dismiss(ORGANIZATION_A, USER_A)
    const dismissed = await repository.findByUser(ORGANIZATION_A, USER_A)
    expect(dismissed?.dismissedAt).toBeInstanceOf(Date)

    await repository.ensure(ORGANIZATION_A, USER_A)
    expect((await repository.findByUser(ORGANIZATION_A, USER_A))?.dismissedAt).toEqual(
      dismissed?.dismissedAt ?? null,
    )
  })

  test('ensure cannot plant a row in another actor workspace', async () => {
    const attempt = withActorWorkspaceTransactionOn(db, ORGANIZATION_B, USER_B, (tx) =>
      tx
        .insert(financialOnboardingProgress)
        .values({ organizationId: ORGANIZATION_A, userId: USER_A }),
    )

    await expect(attempt).rejects.toThrow()
  })

  test('dismissal writes only the scoped progress row', async () => {
    await repository.dismiss(ORGANIZATION_A, USER_A)
    expect((await repository.findByUser(ORGANIZATION_A, USER_A))?.dismissedAt).toBeInstanceOf(Date)
    expect((await repository.findByUser(ORGANIZATION_B, USER_B))?.dismissedAt).toBeNull()
  })

  test('RLS WITH CHECK rejects a cross-tenant write', async () => {
    const attempt = withActorWorkspaceTransactionOn(db, ORGANIZATION_B, USER_B, (tx) =>
      tx
        .insert(financialOnboardingProgress)
        .values({ organizationId: ORGANIZATION_A, userId: USER_B }),
    )

    await expect(attempt).rejects.toThrow()
  })

  test('without context, progress rows are invisible', async () => {
    const rows = await db.execute(
      sql`select organization_id from financial_onboarding_progress where organization_id = ${ORGANIZATION_A}`,
    )
    expect([...rows]).toHaveLength(0)
  })

  test('a failed transaction rolls back dismissal', async () => {
    const attempt = withActorWorkspaceTransactionOn(db, ORGANIZATION_B, USER_B, async (tx) => {
      await tx
        .update(financialOnboardingProgress)
        .set({ dismissedAt: new Date() })
        .where(sql`organization_id = ${ORGANIZATION_B} and user_id = ${USER_B}`)
      throw new Error('forced rollback')
    })

    await expect(attempt).rejects.toThrow('forced rollback')
    expect((await repository.findByUser(ORGANIZATION_B, USER_B))?.dismissedAt).toBeNull()
  })
})
