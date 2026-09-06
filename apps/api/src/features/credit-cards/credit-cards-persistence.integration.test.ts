import { afterAll, beforeAll, describe, expect, test } from 'bun:test'
import type { EntityId } from '@fifilo/core/primitives'
import { generateEntityId } from '@fifilo/core/primitives'
import { db } from '@fifilo/infra-database/client'
import { financialAccounts, organizations, users } from '@fifilo/infra-database/schema'
import { withWorkspaceTransactionOn } from '@fifilo/infra-database/workspace'
import { eq, inArray, sql } from 'drizzle-orm'

import { requirePostgres } from '../../test/require-postgres'
import { createCreditCardsRepository } from './credit-cards-persistence'

/**
 * The five negative RLS proofs against real PostgreSQL, through the adapter
 * the API actually calls (Fase 03 § Persistência: `credit_card_details`).
 */
const ORGANIZATION_A = `test_credit_cards_org_a_${generateEntityId()}`
const ORGANIZATION_B = `test_credit_cards_org_b_${generateEntityId()}`
const USER_ID = `test_credit_cards_user_${generateEntityId()}`

const repository = createCreditCardsRepository()

const seedAccount = async (organizationId: string): Promise<EntityId> => {
  const id = generateEntityId()
  await withWorkspaceTransactionOn(db, organizationId, (tx) =>
    tx.insert(financialAccounts).values({
      createdBy: USER_ID,
      currency: 'BRL',
      id,
      kind: 'credit_card',
      name: `Card ${id}`,
      organizationId,
    }),
  )
  return id
}

beforeAll(async () => {
  await requirePostgres()

  await db.insert(organizations).values([
    { id: ORGANIZATION_A, name: 'Test Credit Cards Org A', slug: `${ORGANIZATION_A}-slug` },
    { id: ORGANIZATION_B, name: 'Test Credit Cards Org B', slug: `${ORGANIZATION_B}-slug` },
  ])
  await db.insert(users).values({
    email: `${USER_ID}@fifilo.local`,
    emailVerified: true,
    id: USER_ID,
    name: 'Test Credit Cards User',
  })
})

afterAll(async () => {
  // Cascades to every financial_accounts/credit_card_details row these tests
  // created; the user is deleted after, since financial_accounts.created_by
  // references it.
  await db.delete(organizations).where(inArray(organizations.id, [ORGANIZATION_A, ORGANIZATION_B]))
  await db.delete(users).where(eq(users.id, USER_ID))
})

describe('credit_card_details persistence', () => {
  test('creates card details and reads them back within its own organization', async () => {
    const accountId = await seedAccount(ORGANIZATION_A)

    const created = await repository.create({
      accountId,
      closingDay: 10,
      createdAt: new Date(),
      dueDay: 20,
      limitMinor: 500_000,
      organizationId: ORGANIZATION_A,
    })

    expect(created?.limitMinor).toBe(500_000)

    const found = await repository.findByAccountId(ORGANIZATION_A, accountId)
    expect(found?.accountId).toBe(accountId)
  })

  test('another organization cannot find the first organization`s card details', async () => {
    const accountId = await seedAccount(ORGANIZATION_A)
    await repository.create({
      accountId,
      closingDay: 5,
      createdAt: new Date(),
      dueDay: 15,
      limitMinor: 300_000,
      organizationId: ORGANIZATION_A,
    })

    const foundByB = await repository.findByAccountId(ORGANIZATION_B, accountId)
    expect(foundByB).toBeNull()
  })

  test('row-level security rejects a write claiming another organization`s id (WITH CHECK)', async () => {
    const accountId = await seedAccount(ORGANIZATION_A)

    const attempt = withWorkspaceTransactionOn(db, ORGANIZATION_B, (tx) =>
      tx.execute(
        sql`insert into credit_card_details
              (organization_id, account_id, closing_day, due_day, limit_minor)
            values
              (${ORGANIZATION_A}, ${accountId}, 10, 20, 100000)`,
      ),
    )

    await expect(attempt).rejects.toThrow()
  })

  test('without a workspace context, card details are invisible', async () => {
    const accountId = await seedAccount(ORGANIZATION_A)
    await repository.create({
      accountId,
      closingDay: 10,
      createdAt: new Date(),
      dueDay: 20,
      limitMinor: 100_000,
      organizationId: ORGANIZATION_A,
    })

    const rows = await db.execute(
      sql`select account_id from credit_card_details where account_id = ${accountId}`,
    )
    expect([...rows]).toHaveLength(0)
  })

  test('an error mid-transaction rolls back planted card details', async () => {
    const accountId = await seedAccount(ORGANIZATION_A)

    const failure = withWorkspaceTransactionOn(db, ORGANIZATION_A, async (tx) => {
      await tx.execute(
        sql`insert into credit_card_details
              (organization_id, account_id, closing_day, due_day, limit_minor)
            values
              (${ORGANIZATION_A}, ${accountId}, 10, 20, 100000)`,
      )
      throw new Error('forced rollback')
    })

    await expect(failure).rejects.toThrow('forced rollback')

    const found = await repository.findByAccountId(ORGANIZATION_A, accountId)
    expect(found).toBeNull()
  })

  test('a second attachment to the same account returns null instead of throwing', async () => {
    const accountId = await seedAccount(ORGANIZATION_A)
    const record = {
      accountId,
      closingDay: 10,
      createdAt: new Date(),
      dueDay: 20,
      limitMinor: 100_000,
      organizationId: ORGANIZATION_A,
    }

    const first = await repository.create(record)
    const second = await repository.create(record)

    expect(first).not.toBeNull()
    expect(second).toBeNull()
  })
})
