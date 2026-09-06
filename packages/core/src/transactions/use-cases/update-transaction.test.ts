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
const groceries = { archivedAt: null, id: generateEntityId(), kind: 'expense' as const }
const accounts = createFakeAccountLookup([checking])
const categories = createFakeCategoryLookup([groceries])

const seedTransaction = (overrides: Partial<Transaction> = {}): Transaction => ({
  categoryId: groceries.id,
  createdAt: new Date('2026-01-01'),
  createdBy: generateEntityId(),
  description: 'Supermercado',
  id: generateEntityId(),
  kind: 'expense',
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
      },
      repository,
      accounts,
      categories,
    )

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.value.version).toBe(2)
    expect(repository.legsByTransactionId.get(transaction.id)).toEqual([
      { accountId: checking.id, amountMinor: -7_500, id: expect.any(String) },
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
      },
      repository,
      accounts,
      categories,
    )

    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error.code).toBe('version_conflict')
  })

  test('the kind cannot change on edit', async () => {
    const transaction = seedTransaction({ kind: 'expense' })
    const repository = createFakeTransactionRepository([transaction])

    const result = await updateTransaction(
      {
        amountMinor: 7_500,
        description: 'Virou transferência?',
        expectedVersion: 1,
        fromAccountId: checking.id,
        id: transaction.id,
        kind: 'transfer',
        notes: null,
        occurredOn: '2026-01-15',
        organizationId: orgId,
        toAccountId: generateEntityId(),
      },
      repository,
      accounts,
      categories,
    )

    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error.code).toBe('transaction_kind_immutable')
  })
})
