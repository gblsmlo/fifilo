import { afterAll, beforeAll, describe, expect, test } from 'bun:test'
import type { EntityId } from '@fifilo/core/primitives'
import { generateEntityId } from '@fifilo/core/primitives'
import { db } from '@fifilo/infra-database/client'
import { organizations, users } from '@fifilo/infra-database/schema'
import { withWorkspaceTransactionOn } from '@fifilo/infra-database/workspace'
import { eq, inArray, sql } from 'drizzle-orm'

import { requirePostgres } from '../../test/require-postgres'
import { createFinancialEntryReader } from './entry-reader-persistence'
import { createFinancialAccountRepository } from './financial-accounts-persistence'

/**
 * Proves the real adapter against real PostgreSQL: cross-tenant isolation
 * through the repository the API actually calls, plus the `WITH CHECK` and
 * no-context proofs raw, the same way Fase 00's suite did for its fixture -
 * `financial_accounts` and `entries` are the first real tables to carry the
 * recipe, so the wiring itself, not just the mechanism, needs proving.
 */
const ORGANIZATION_A = `test_accounts_org_a_${generateEntityId()}`
const ORGANIZATION_B = `test_accounts_org_b_${generateEntityId()}`
const USER_ID = `test_accounts_user_${generateEntityId()}`

const repository = createFinancialAccountRepository()
const entryReader = createFinancialEntryReader()

beforeAll(async () => {
  await requirePostgres()

  await db.insert(organizations).values([
    { id: ORGANIZATION_A, name: 'Test Accounts Org A', slug: `${ORGANIZATION_A}-slug` },
    { id: ORGANIZATION_B, name: 'Test Accounts Org B', slug: `${ORGANIZATION_B}-slug` },
  ])
  await db.insert(users).values({
    email: `${USER_ID}@fifilo.local`,
    emailVerified: true,
    id: USER_ID,
    name: 'Test Accounts User',
  })
})

afterAll(async () => {
  // Cascades to every financial_accounts/entries row these tests created.
  await db.delete(organizations).where(inArray(organizations.id, [ORGANIZATION_A, ORGANIZATION_B]))
  await db.delete(users).where(eq(users.id, USER_ID))
})

describe('financial accounts persistence', () => {
  test('a duplicate name at the repository itself - bypassing the use case`s upfront check - returns null, not a thrown exception', async () => {
    const first = {
      color: null,
      createdAt: new Date(),
      createdBy: USER_ID as EntityId,
      currency: 'BRL' as const,
      icon: null,
      id: generateEntityId(),
      institution: null,
      kind: 'wallet' as const,
      name: 'Race Condition Check',
      organizationId: ORGANIZATION_A,
    }

    await repository.create(first, null)
    const second = await repository.create({ ...first, id: generateEntityId() }, null)

    expect(second).toBeNull()
  })

  test('creates an account with its opening entry atomically, and the balance reads it back', async () => {
    const id = generateEntityId()

    const created = await repository.create(
      {
        color: null,
        createdAt: new Date(),
        createdBy: USER_ID as EntityId,
        currency: 'BRL',
        icon: null,
        id,
        institution: null,
        kind: 'checking',
        name: 'Checking',
        organizationId: ORGANIZATION_A,
      },
      { amountMinor: 5_000, id: generateEntityId(), occurredOn: '2026-01-01' },
    )

    expect(created?.name).toBe('Checking')

    const balances = await entryReader.balancesByAccount(ORGANIZATION_A, '2026-12-31')
    expect(balances.get(id)).toBe(5_000)
  })

  test('another organization cannot list, find or read the balance of the first organization`s account', async () => {
    const id = generateEntityId()
    await repository.create(
      {
        color: null,
        createdAt: new Date(),
        createdBy: USER_ID as EntityId,
        currency: 'BRL',
        icon: null,
        id,
        institution: null,
        kind: 'wallet',
        name: 'Cross-tenant wallet',
        organizationId: ORGANIZATION_A,
      },
      null,
    )

    const listedByB = await repository.list(ORGANIZATION_B, { includeArchived: true })
    expect(listedByB.some((account) => account.id === id)).toBe(false)

    const foundByB = await repository.findByName(ORGANIZATION_B, 'cross-tenant wallet')
    expect(foundByB).toBeNull()

    const balancesForB = await entryReader.balancesByAccount(ORGANIZATION_B, '2026-12-31')
    expect(balancesForB.has(id)).toBe(false)
  })

  test('a stale version is a conflict, not a silent overwrite (optimistic concurrency)', async () => {
    const id = generateEntityId()
    await repository.create(
      {
        color: null,
        createdAt: new Date(),
        createdBy: USER_ID as EntityId,
        currency: 'BRL',
        icon: null,
        id,
        institution: null,
        kind: 'savings',
        name: 'Concurrency check',
        organizationId: ORGANIZATION_A,
      },
      null,
    )

    const first = await repository.update(ORGANIZATION_A, id, 1, { institution: 'Bank A' })
    expect(first).not.toBe('not_found')
    expect(first).not.toBe('version_conflict')

    const second = await repository.update(ORGANIZATION_A, id, 1, { institution: 'Bank B' })
    expect(second).toBe('version_conflict')
  })

  test('row-level security rejects a write claiming another organization`s id (WITH CHECK)', async () => {
    const attempt = withWorkspaceTransactionOn(db, ORGANIZATION_B, (tx) =>
      tx.execute(
        sql`insert into financial_accounts
              (organization_id, id, kind, name, currency, created_by)
            values
              (${ORGANIZATION_A}, ${generateEntityId()}, 'wallet', 'Planted', 'BRL', ${USER_ID})`,
      ),
    )

    await expect(attempt).rejects.toThrow()
  })

  test('without a workspace context, financial_accounts and entries are invisible', async () => {
    const id = generateEntityId()
    await repository.create(
      {
        color: null,
        createdAt: new Date(),
        createdBy: USER_ID as EntityId,
        currency: 'BRL',
        icon: null,
        id,
        institution: null,
        kind: 'checking',
        name: 'No context check',
        organizationId: ORGANIZATION_A,
      },
      { amountMinor: 1_000, id: generateEntityId(), occurredOn: '2026-01-01' },
    )

    const accountRows = await db.execute(sql`select id from financial_accounts where id = ${id}`)
    expect([...accountRows]).toHaveLength(0)

    const entryRows = await db.execute(sql`select id from entries where account_id = ${id}`)
    expect([...entryRows]).toHaveLength(0)
  })

  test('an error mid-transaction rolls back both the account and its entry', async () => {
    const id = generateEntityId()

    const failure = withWorkspaceTransactionOn(db, ORGANIZATION_A, async (tx) => {
      await tx.execute(
        sql`insert into financial_accounts
              (organization_id, id, kind, name, currency, created_by)
            values
              (${ORGANIZATION_A}, ${id}, 'wallet', 'Rollback check', 'BRL', ${USER_ID})`,
      )
      await tx.execute(
        sql`insert into entries
              (organization_id, id, account_id, amount_minor, currency, occurred_on)
            values
              (${ORGANIZATION_A}, ${generateEntityId()}, ${id}, 1000, 'BRL', '2026-01-01')`,
      )
      throw new Error('forced rollback')
    })

    await expect(failure).rejects.toThrow('forced rollback')

    const accountRows = await withWorkspaceTransactionOn(db, ORGANIZATION_A, (tx) =>
      tx.execute(sql`select id from financial_accounts where id = ${id}`),
    )
    expect([...accountRows]).toHaveLength(0)

    const entryRows = await withWorkspaceTransactionOn(db, ORGANIZATION_A, (tx) =>
      tx.execute(sql`select id from entries where account_id = ${id}`),
    )
    expect([...entryRows]).toHaveLength(0)
  })
})
