import { afterAll, beforeAll, describe, expect, test } from 'bun:test'
import type { EntityId } from '@fifilo/core/primitives'
import { generateEntityId } from '@fifilo/core/primitives'
import { db } from '@fifilo/infra-database/client'
import {
  categories,
  entries,
  financialAccounts,
  organizations,
  transactions,
  users,
} from '@fifilo/infra-database/schema'
import { withWorkspaceTransactionOn } from '@fifilo/infra-database/workspace'
import { eq, inArray } from 'drizzle-orm'

import { requirePostgres } from '../../test/require-postgres'
import { createAnalyticsReader } from './analytics-persistence'

/**
 * The two risks Fase 05 § Riscos names by name, proven against real
 * PostgreSQL through the same reader the API calls: a transfer must not
 * inflate income or expense, and an installment counts at its own
 * competência - the date its own transaction row carries, not the date of
 * the original purchase (already guaranteed by Fase 03's one-row-per-cycle
 * design; this is the analytics side reading that guarantee back).
 */
const ORGANIZATION_A = `test_analytics_org_a_${generateEntityId()}`
const ORGANIZATION_B = `test_analytics_org_b_${generateEntityId()}`
const USER_ID = `test_analytics_user_${generateEntityId()}`

const reader = createAnalyticsReader()

let checkingId: EntityId
let checkingTwoId: EntityId
let cardAccountId: EntityId
let expenseCategoryId: EntityId

beforeAll(async () => {
  await requirePostgres()

  await db.insert(organizations).values([
    { id: ORGANIZATION_A, name: 'Test Analytics Org A', slug: `${ORGANIZATION_A}-slug` },
    { id: ORGANIZATION_B, name: 'Test Analytics Org B', slug: `${ORGANIZATION_B}-slug` },
  ])
  await db.insert(users).values({
    email: `${USER_ID}@fifilo.local`,
    emailVerified: true,
    id: USER_ID,
    name: 'Test Analytics User',
  })

  checkingId = generateEntityId()
  checkingTwoId = generateEntityId()
  cardAccountId = generateEntityId()
  expenseCategoryId = generateEntityId()
  const incomeCategoryId = generateEntityId()

  await withWorkspaceTransactionOn(db, ORGANIZATION_A, async (tx) => {
    await tx.insert(financialAccounts).values([
      {
        createdBy: USER_ID,
        currency: 'BRL',
        id: checkingId,
        kind: 'checking',
        name: 'Checking',
        organizationId: ORGANIZATION_A,
      },
      {
        createdBy: USER_ID,
        currency: 'BRL',
        id: checkingTwoId,
        kind: 'checking',
        name: 'Checking two',
        organizationId: ORGANIZATION_A,
      },
      {
        createdBy: USER_ID,
        currency: 'BRL',
        id: cardAccountId,
        kind: 'credit_card',
        name: 'Card',
        organizationId: ORGANIZATION_A,
      },
    ])

    await tx.insert(categories).values([
      { id: expenseCategoryId, kind: 'expense', name: 'Mercado', organizationId: ORGANIZATION_A },
      { id: incomeCategoryId, kind: 'income', name: 'Salário', organizationId: ORGANIZATION_A },
    ])

    const income = generateEntityId()
    await tx.insert(transactions).values({
      categoryId: incomeCategoryId,
      createdBy: USER_ID,
      description: 'Salário',
      id: income,
      kind: 'income',
      occurredOn: '2026-01-05',
      organizationId: ORGANIZATION_A,
    })
    await tx.insert(entries).values({
      accountId: checkingId,
      amountMinor: 50_000,
      currency: 'BRL',
      id: generateEntityId(),
      occurredOn: '2026-01-05',
      organizationId: ORGANIZATION_A,
      transactionId: income,
    })

    const expense = generateEntityId()
    await tx.insert(transactions).values({
      categoryId: expenseCategoryId,
      createdBy: USER_ID,
      description: 'Mercado do mês',
      id: expense,
      kind: 'expense',
      occurredOn: '2026-01-10',
      organizationId: ORGANIZATION_A,
    })
    await tx.insert(entries).values({
      accountId: checkingId,
      amountMinor: -20_000,
      currency: 'BRL',
      id: generateEntityId(),
      occurredOn: '2026-01-10',
      organizationId: ORGANIZATION_A,
      transactionId: expense,
    })

    // A transfer between the workspace's own accounts (Decision 023): two
    // legs, zero category, and it must never reach a cashflow or
    // category-spend total.
    const transfer = generateEntityId()
    await tx.insert(transactions).values({
      createdBy: USER_ID,
      description: 'Reserva',
      id: transfer,
      kind: 'transfer',
      occurredOn: '2026-01-15',
      organizationId: ORGANIZATION_A,
    })
    await tx.insert(entries).values([
      {
        accountId: checkingId,
        amountMinor: -10_000,
        currency: 'BRL',
        id: generateEntityId(),
        occurredOn: '2026-01-15',
        organizationId: ORGANIZATION_A,
        transactionId: transfer,
      },
      {
        accountId: checkingTwoId,
        amountMinor: 10_000,
        currency: 'BRL',
        id: generateEntityId(),
        occurredOn: '2026-01-15',
        organizationId: ORGANIZATION_A,
        transactionId: transfer,
      },
    ])

    // Two installments of one purchase (Fase 03's design), one transaction
    // per cycle, each carrying its own `occurredOn` a month apart.
    const installmentOne = generateEntityId()
    await tx.insert(transactions).values({
      categoryId: expenseCategoryId,
      createdBy: USER_ID,
      description: 'Notebook 1/2',
      id: installmentOne,
      installmentNumber: 1,
      kind: 'expense',
      occurredOn: '2026-01-20',
      organizationId: ORGANIZATION_A,
    })
    await tx.insert(entries).values({
      accountId: cardAccountId,
      amountMinor: -3_000,
      currency: 'BRL',
      id: generateEntityId(),
      occurredOn: '2026-01-20',
      organizationId: ORGANIZATION_A,
      transactionId: installmentOne,
    })

    const installmentTwo = generateEntityId()
    await tx.insert(transactions).values({
      categoryId: expenseCategoryId,
      createdBy: USER_ID,
      description: 'Notebook 2/2',
      id: installmentTwo,
      installmentNumber: 2,
      kind: 'expense',
      occurredOn: '2026-02-20',
      organizationId: ORGANIZATION_A,
    })
    await tx.insert(entries).values({
      accountId: cardAccountId,
      amountMinor: -3_000,
      currency: 'BRL',
      id: generateEntityId(),
      occurredOn: '2026-02-20',
      organizationId: ORGANIZATION_A,
      transactionId: installmentTwo,
    })
  })
})

afterAll(async () => {
  await db.delete(organizations).where(inArray(organizations.id, [ORGANIZATION_A, ORGANIZATION_B]))
  await db.delete(users).where(eq(users.id, USER_ID))
})

describe('analytics persistence', () => {
  test('monthlyCashflow buckets an installment at its own competência and never counts a transfer', async () => {
    const points = await reader.monthlyCashflow({
      from: '2026-01-01',
      organizationId: ORGANIZATION_A,
      to: '2026-02-28',
    })

    expect(points).toEqual([
      { expenseMinor: 23_000, incomeMinor: 50_000, month: '2026-01' },
      { expenseMinor: 3_000, incomeMinor: 0, month: '2026-02' },
    ])
  })

  test('another organization`s cashflow is empty - RLS, not an empty range', async () => {
    const points = await reader.monthlyCashflow({
      from: '2026-01-01',
      organizationId: ORGANIZATION_B,
      to: '2026-02-28',
    })

    expect(points).toEqual([])
  })

  test('spendByCategory sums every expense under its category, transfer excluded by construction', async () => {
    const rows = await reader.spendByCategory({
      from: '2026-01-01',
      kind: 'expense',
      organizationId: ORGANIZATION_A,
      to: '2026-02-28',
    })

    expect(rows).toEqual([
      {
        categoryId: expenseCategoryId,
        categoryName: 'Mercado',
        parentId: null,
        totalMinor: 26_000,
      },
    ])
  })

  test('spendByAccount tells cash and card spend apart', async () => {
    const rows = await reader.spendByAccount({
      from: '2026-01-01',
      organizationId: ORGANIZATION_A,
      to: '2026-02-28',
    })

    expect(rows).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ accountId: checkingId, kind: 'checking', totalMinor: 20_000 }),
        expect.objectContaining({
          accountId: cardAccountId,
          kind: 'credit_card',
          totalMinor: 6_000,
        }),
      ]),
    )
  })

  test('topExpenses returns the largest expense first', async () => {
    const rows = await reader.topExpenses({
      from: '2026-01-01',
      limit: 2,
      organizationId: ORGANIZATION_A,
      to: '2026-02-28',
    })

    expect(rows).toHaveLength(2)
    expect(rows[0]?.amountMinor).toBe(20_000)
    expect(rows[1]?.amountMinor).toBe(3_000)
  })

  test('balanceEvolution runs a per-account and a consolidated cumulative sum', async () => {
    const result = await reader.balanceEvolution({
      accountId: checkingId,
      from: '2026-01-01',
      organizationId: ORGANIZATION_A,
      to: '2026-01-31',
    })

    expect(result.accounts).toEqual([
      {
        accountId: checkingId,
        points: [
          { balanceMinor: 50_000, date: '2026-01-05' },
          { balanceMinor: 30_000, date: '2026-01-10' },
          { balanceMinor: 20_000, date: '2026-01-15' },
        ],
      },
    ])
    expect(result.consolidated).toEqual([
      { balanceMinor: 50_000, date: '2026-01-05' },
      { balanceMinor: 30_000, date: '2026-01-10' },
      { balanceMinor: 30_000, date: '2026-01-15' },
      { balanceMinor: 27_000, date: '2026-01-20' },
    ])
  })

  test('consolidatedBalance keeps cash and card commitments apart - no invoice exists yet, so nothing is committed', async () => {
    const result = await reader.consolidatedBalance(ORGANIZATION_A, '2026-02-28')

    expect(result).toEqual({ availableCashMinor: 30_000, committedInvoiceMinor: 0 })
  })

  test('an empty period reports no rows, not an error', async () => {
    const points = await reader.monthlyCashflow({
      from: '2030-01-01',
      organizationId: ORGANIZATION_A,
      to: '2030-12-31',
    })

    expect(points).toEqual([])
  })

  test('a month with no movement inside the queried range is simply absent, not zero-filled', async () => {
    const points = await reader.monthlyCashflow({
      from: '2026-01-01',
      organizationId: ORGANIZATION_A,
      to: '2026-04-30',
    })

    expect(points.map((point) => point.month)).toEqual(['2026-01', '2026-02'])
  })

  test('an archived account still reports its historical spend', async () => {
    await withWorkspaceTransactionOn(db, ORGANIZATION_A, (tx) =>
      tx
        .update(financialAccounts)
        .set({ archivedAt: new Date() })
        .where(eq(financialAccounts.id, checkingId)),
    )

    const rows = await reader.spendByAccount({
      from: '2026-01-01',
      organizationId: ORGANIZATION_A,
      to: '2026-02-28',
    })

    expect(rows).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ accountId: checkingId, totalMinor: 20_000 }),
      ]),
    )
  })
})
