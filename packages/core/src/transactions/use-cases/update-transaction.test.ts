import { describe, expect, test } from 'bun:test'

import { generateEntityId } from '../../primitives'
import type { Transaction } from '../transaction'
import {
  createFakeAccountLookup,
  createFakeCategoryLookup,
  createFakeTransactionRepository,
} from './fake-transaction-repository'
import { updateTransaction } from './update-transaction'

const orgId = 'org_a'
const checking = { archivedAt: null, currency: 'BRL' as const, id: generateEntityId() }
const wallet = { archivedAt: null, currency: 'BRL' as const, id: generateEntityId() }
const groceries = { archivedAt: null, id: generateEntityId(), kind: 'expense' as const }
const salary = { archivedAt: null, id: generateEntityId(), kind: 'income' as const }
const accounts = createFakeAccountLookup([checking, wallet])
const categories = createFakeCategoryLookup([groceries, salary])

const seedTransaction = (overrides: Partial<Transaction> = {}): Transaction => ({
  categoryId: groceries.id,
  createdAt: new Date('2026-01-01'),
  createdBy: generateEntityId(),
  description: 'Supermercado',
  id: generateEntityId(),
  kind: 'expense',
  legs: [],
  notes: null,
  occurredOn: '2026-01-15',
  organizationId: orgId,
  updatedAt: new Date('2026-01-01'),
  version: 1,
  ...overrides,
})

describe('updateTransaction', () => {
  test('rewrites the legs and bumps the version', async () => {
    const transaction = seedTransaction()
    const repository = createFakeTransactionRepository([transaction])

    const result = await updateTransaction(
      {
        accountId: checking.id,
        amountMinor: 7_500,
        categoryId: groceries.id,
        description: 'Supermercado (ajustado)',
        expectedVersion: 1,
        id: transaction.id,
        kind: 'expense',
        notes: null,
        occurredOn: '2026-01-16',
        organizationId: orgId,
        role: 'owner',
      },
      repository,
      accounts,
      categories,
    )

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.value.version).toBe(2)
    expect(repository.legsByTransactionId.get(transaction.id)).toEqual([
      { accountId: checking.id, amountMinor: -7_500, currency: 'BRL', id: expect.any(String) },
    ])
  })

  test('a stale version is a conflict', async () => {
    const transaction = seedTransaction({ version: 3 })
    const repository = createFakeTransactionRepository([transaction])

    const result = await updateTransaction(
      {
        accountId: checking.id,
        amountMinor: 7_500,
        categoryId: groceries.id,
        description: 'Supermercado',
        expectedVersion: 1,
        id: transaction.id,
        kind: 'expense',
        notes: null,
        occurredOn: '2026-01-15',
        organizationId: orgId,
        role: 'owner',
      },
      repository,
      accounts,
      categories,
    )

    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error.code).toBe('version_conflict')
  })

  test('an expense becomes an income, and the leg flips sign with it', async () => {
    const transaction = seedTransaction()
    const repository = createFakeTransactionRepository([transaction])

    const result = await updateTransaction(
      {
        accountId: checking.id,
        amountMinor: 7_500,
        categoryId: salary.id,
        description: 'Era despesa, virou receita',
        expectedVersion: 1,
        id: transaction.id,
        kind: 'income',
        notes: null,
        occurredOn: '2026-01-15',
        organizationId: orgId,
        role: 'owner',
      },
      repository,
      accounts,
      categories,
    )

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.value.kind).toBe('income')
    expect(repository.legsByTransactionId.get(transaction.id)).toEqual([
      { accountId: checking.id, amountMinor: 7_500, currency: 'BRL', id: expect.any(String) },
    ])
  })

  test('the new kind still rules the category: an expense category refuses an income', async () => {
    const transaction = seedTransaction()
    const repository = createFakeTransactionRepository([transaction])

    const result = await updateTransaction(
      {
        accountId: checking.id,
        amountMinor: 7_500,
        categoryId: groceries.id,
        description: 'Receita com categoria de despesa',
        expectedVersion: 1,
        id: transaction.id,
        kind: 'income',
        notes: null,
        occurredOn: '2026-01-15',
        organizationId: orgId,
        role: 'owner',
      },
      repository,
      accounts,
      categories,
    )

    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error.code).toBe('category_kind_mismatch')
  })

  test('an expense becomes a transfer, and the single leg becomes two', async () => {
    const transaction = seedTransaction()
    const repository = createFakeTransactionRepository([transaction])

    const result = await updateTransaction(
      {
        amountMinor: 7_500,
        description: 'Virou transferência',
        expectedVersion: 1,
        fromAccountId: checking.id,
        id: transaction.id,
        kind: 'transfer',
        notes: null,
        occurredOn: '2026-01-15',
        organizationId: orgId,
        role: 'owner',
        toAccountId: wallet.id,
      },
      repository,
      accounts,
      categories,
    )

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.value.kind).toBe('transfer')
    // A transfer carries no category: the one the expense had goes with it.
    expect(result.value.categoryId).toBeNull()
    expect(repository.legsByTransactionId.get(transaction.id)).toEqual([
      { accountId: checking.id, amountMinor: -7_500, currency: 'BRL', id: expect.any(String) },
      { accountId: wallet.id, amountMinor: 7_500, currency: 'BRL', id: expect.any(String) },
    ])
  })

  test('a transfer becomes an expense, and the two legs collapse into one', async () => {
    const transaction = seedTransaction({
      categoryId: null,
      kind: 'transfer',
      legs: [
        { accountId: checking.id, amountMinor: -7_500 },
        { accountId: wallet.id, amountMinor: 7_500 },
      ],
    })
    const repository = createFakeTransactionRepository([transaction])

    const result = await updateTransaction(
      {
        accountId: checking.id,
        amountMinor: 7_500,
        categoryId: groceries.id,
        description: 'Virou despesa',
        expectedVersion: 1,
        id: transaction.id,
        kind: 'expense',
        notes: null,
        occurredOn: '2026-01-15',
        organizationId: orgId,
        role: 'owner',
      },
      repository,
      accounts,
      categories,
    )

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.value.kind).toBe('expense')
    expect(repository.legsByTransactionId.get(transaction.id)).toEqual([
      { accountId: checking.id, amountMinor: -7_500, currency: 'BRL', id: expect.any(String) },
    ])
  })

  test('the two accounts of a transfer must share a currency', async () => {
    const euros = { archivedAt: null, currency: 'EUR' as const, id: generateEntityId() }
    const transaction = seedTransaction()
    const repository = createFakeTransactionRepository([transaction])

    const result = await updateTransaction(
      {
        amountMinor: 7_500,
        description: 'Transferência entre moedas',
        expectedVersion: 1,
        fromAccountId: checking.id,
        id: transaction.id,
        kind: 'transfer',
        notes: null,
        occurredOn: '2026-01-15',
        organizationId: orgId,
        role: 'owner',
        toAccountId: euros.id,
      },
      repository,
      createFakeAccountLookup([checking, euros]),
      categories,
    )

    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error.code).toBe('currency_mismatch')
  })
})
