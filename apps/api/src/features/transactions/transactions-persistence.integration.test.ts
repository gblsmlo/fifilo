import { afterAll, beforeAll, describe, expect, test } from 'bun:test'
import type { EntityId } from '@fifilo/core/primitives'
import { generateEntityId } from '@fifilo/core/primitives'
import { db } from '@fifilo/infra-database/client'
import { organizations, users } from '@fifilo/infra-database/schema'
import { withWorkspaceTransactionOn } from '@fifilo/infra-database/workspace'
import { eq, inArray, sql } from 'drizzle-orm'

import { requirePostgres } from '../../test/require-postgres'
import { createFinancialAccountRepository } from '../accounts/financial-accounts-persistence'
import { createTransactionsRepository } from './transactions-persistence'

/**
 * Proves the real adapter against real PostgreSQL, the same five negative
 * proofs `tenant-workspace-policy.integration.test.ts` established for the
 * fixture table (Fase 00), plus the cursor pagination boundary this feature
 * introduces: two rows sharing `occurred_on` must still resolve to a strict
 * order on `(occurred_on, id)` (Fase 02 § API).
 */
const ORGANIZATION_A = `test_transactions_org_a_${generateEntityId()}`
const ORGANIZATION_B = `test_transactions_org_b_${generateEntityId()}`
const USER_ID = `test_transactions_user_${generateEntityId()}` as EntityId

const accountRepository = createFinancialAccountRepository()
const repository = createTransactionsRepository()

let accountA: EntityId
let accountB: EntityId

beforeAll(async () => {
  await requirePostgres()

  await db.insert(organizations).values([
    { id: ORGANIZATION_A, name: 'Test Transactions Org A', slug: `${ORGANIZATION_A}-slug` },
    { id: ORGANIZATION_B, name: 'Test Transactions Org B', slug: `${ORGANIZATION_B}-slug` },
  ])
  await db.insert(users).values({
    email: `${USER_ID}@fifilo.local`,
    emailVerified: true,
    id: USER_ID,
    name: 'Test Transactions User',
  })

  accountA = generateEntityId()
  await accountRepository.create(
    {
      color: null,
      createdAt: new Date(),
      createdBy: USER_ID,
      currency: 'BRL',
      icon: null,
      id: accountA,
      institution: null,
      kind: 'checking',
      name: 'Conta A',
      organizationId: ORGANIZATION_A,
    },
    null,
  )

  accountB = generateEntityId()
  await accountRepository.create(
    {
      color: null,
      createdAt: new Date(),
      createdBy: USER_ID,
      currency: 'BRL',
      icon: null,
      id: accountB,
      institution: null,
      kind: 'wallet',
      name: 'Conta B',
      organizationId: ORGANIZATION_A,
    },
    null,
  )
})

afterAll(async () => {
  // Cascades to every transactions/entries/financial_accounts row these tests
  // created; the user is deleted after, since `transactions.created_by`
  // references it.
  await db.delete(organizations).where(inArray(organizations.id, [ORGANIZATION_A, ORGANIZATION_B]))
  await db.delete(users).where(eq(users.id, USER_ID))
})

describe('transactions persistence', () => {
  test('creates a transaction with its legs atomically and reads it back', async () => {
    const id = generateEntityId()
    const created = await repository.create({
      categoryId: null,
      createdAt: new Date(),
      createdBy: USER_ID,
      description: 'Compra',
      id,
      kind: 'expense',
      legs: [{ accountId: accountA, amountMinor: -1_000, currency: 'BRL', id: generateEntityId() }],
      notes: null,
      occurredOn: '2026-01-10',
      organizationId: ORGANIZATION_A,
    })

    expect(created.legs).toEqual([{ accountId: accountA, amountMinor: -1_000 }])

    const found = await repository.findById(ORGANIZATION_A, id)
    expect(found?.description).toBe('Compra')
  })

  test('another organization cannot list or find the first organization`s transaction', async () => {
    const id = generateEntityId()
    await repository.create({
      categoryId: null,
      createdAt: new Date(),
      createdBy: USER_ID,
      description: 'Cross-tenant expense',
      id,
      kind: 'expense',
      legs: [{ accountId: accountA, amountMinor: -500, currency: 'BRL', id: generateEntityId() }],
      notes: null,
      occurredOn: '2026-01-11',
      organizationId: ORGANIZATION_A,
    })

    const foundByB = await repository.findById(ORGANIZATION_B, id)
    expect(foundByB).toBeNull()

    const listedByB = await repository.list(ORGANIZATION_B, { limit: 50 })
    expect(listedByB.items.some((transaction) => transaction.id === id)).toBe(false)
  })

  test('row-level security rejects a write claiming another organization`s id (WITH CHECK)', async () => {
    const attempt = withWorkspaceTransactionOn(db, ORGANIZATION_B, (tx) =>
      tx.execute(
        sql`insert into transactions
              (organization_id, id, kind, description, occurred_on, created_by)
            values
              (${ORGANIZATION_A}, ${generateEntityId()}, 'expense', 'Planted', '2026-01-01', ${USER_ID})`,
      ),
    )

    await expect(attempt).rejects.toThrow()
  })

  test('without a workspace context, transactions are invisible', async () => {
    const id = generateEntityId()
    await repository.create({
      categoryId: null,
      createdAt: new Date(),
      createdBy: USER_ID,
      description: 'No context check',
      id,
      kind: 'expense',
      legs: [{ accountId: accountA, amountMinor: -100, currency: 'BRL', id: generateEntityId() }],
      notes: null,
      occurredOn: '2026-01-12',
      organizationId: ORGANIZATION_A,
    })

    const rows = await db.execute(sql`select id from transactions where id = ${id}`)
    expect([...rows]).toHaveLength(0)
  })

  test('an error mid-transaction rolls back both the transaction and its legs', async () => {
    const id = generateEntityId()

    const failure = withWorkspaceTransactionOn(db, ORGANIZATION_A, async (tx) => {
      await tx.execute(
        sql`insert into transactions
              (organization_id, id, kind, description, occurred_on, created_by)
            values
              (${ORGANIZATION_A}, ${id}, 'expense', 'Rollback check', '2026-01-13', ${USER_ID})`,
      )
      await tx.execute(
        sql`insert into entries
              (organization_id, id, transaction_id, account_id, amount_minor, currency, occurred_on)
            values
              (${ORGANIZATION_A}, ${generateEntityId()}, ${id}, ${accountA}, -100, 'BRL', '2026-01-13')`,
      )
      throw new Error('forced rollback')
    })

    await expect(failure).rejects.toThrow('forced rollback')

    const transactionRows = await withWorkspaceTransactionOn(db, ORGANIZATION_A, (tx) =>
      tx.execute(sql`select id from transactions where id = ${id}`),
    )
    expect([...transactionRows]).toHaveLength(0)

    const entryRows = await withWorkspaceTransactionOn(db, ORGANIZATION_A, (tx) =>
      tx.execute(sql`select id from entries where transaction_id = ${id}`),
    )
    expect([...entryRows]).toHaveLength(0)
  })

  test('a stale version is a conflict, not a silent overwrite (optimistic concurrency)', async () => {
    const id = generateEntityId()
    await repository.create({
      categoryId: null,
      createdAt: new Date(),
      createdBy: USER_ID,
      description: 'Concurrency check',
      id,
      kind: 'expense',
      legs: [{ accountId: accountA, amountMinor: -100, currency: 'BRL', id: generateEntityId() }],
      notes: null,
      occurredOn: '2026-01-14',
      organizationId: ORGANIZATION_A,
    })

    const patch = {
      categoryId: null,
      description: 'Concurrency check',
      legs: [
        {
          accountId: accountA,
          amountMinor: -200,
          currency: 'BRL' as const,
          id: generateEntityId(),
        },
      ],
      notes: null,
      occurredOn: '2026-01-14',
    }

    const first = await repository.update(ORGANIZATION_A, id, 1, patch)
    expect(first).not.toBe('not_found')
    expect(first).not.toBe('version_conflict')

    const second = await repository.update(ORGANIZATION_A, id, 1, patch)
    expect(second).toBe('version_conflict')
  })

  test('cursor pagination resolves the boundary of rows sharing the same date by id', async () => {
    const sharedDate = '2026-02-01'
    const [lowest, middle, highest] = [
      generateEntityId(),
      generateEntityId(),
      generateEntityId(),
    ].sort() as [EntityId, EntityId, EntityId]
    const ids = [lowest, middle, highest]

    for (const id of ids) {
      await repository.create({
        categoryId: null,
        createdAt: new Date(),
        createdBy: USER_ID,
        description: `Same day ${id}`,
        id,
        kind: 'expense',
        legs: [{ accountId: accountB, amountMinor: -100, currency: 'BRL', id: generateEntityId() }],
        notes: null,
        occurredOn: sharedDate,
        organizationId: ORGANIZATION_A,
      })
    }

    const firstPage = await repository.list(ORGANIZATION_A, {
      accountId: accountB,
      limit: 2,
    })

    // `desc(occurred_on), desc(id)`: same date, so the two highest ids come first.
    expect(firstPage.items.map((item) => item.id)).toEqual([highest, middle])
    expect(firstPage.nextCursor).toEqual({ id: middle, occurredOn: sharedDate })

    const secondPage = await repository.list(ORGANIZATION_A, {
      accountId: accountB,
      cursor: firstPage.nextCursor ?? undefined,
      limit: 2,
    })

    // The boundary row (`middle`) must not repeat on the next page, and no
    // row is skipped: only `lowest` remains.
    expect(secondPage.items.map((item) => item.id)).toEqual([lowest])
    expect(secondPage.nextCursor).toBeNull()
  })
})
