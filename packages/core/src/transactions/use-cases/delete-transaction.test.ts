import { describe, expect, test } from 'bun:test'

import { generateEntityId } from '../../primitives'
import type { Transaction } from '../transaction'
import { deleteTransaction } from './delete-transaction'
import { createFakeTransactionRepository } from './fake-transaction-repository'

const seedTransaction = (overrides: Partial<Transaction> = {}): Transaction => ({
  categoryId: null,
  createdAt: new Date('2026-01-01'),
  createdBy: generateEntityId(),
  description: 'Supermercado',
  id: generateEntityId(),
  kind: 'expense',
  notes: null,
  occurredOn: '2026-01-15',
  organizationId: 'org_a',
  updatedAt: new Date('2026-01-01'),
  version: 1,
  ...overrides,
})

describe('deleteTransaction', () => {
  test('deletes the transaction and its legs together', async () => {
    const transaction = seedTransaction()
    const repository = createFakeTransactionRepository([transaction])
    repository.legsByTransactionId.set(transaction.id, [
      { accountId: generateEntityId(), amountMinor: -1_000, id: generateEntityId() },
    ])

    const result = await deleteTransaction(
      { id: transaction.id, organizationId: 'org_a' },
      repository,
    )

    expect(result).toEqual({ ok: true, value: true })
    expect(repository.legsByTransactionId.has(transaction.id)).toBe(false)
  })

  test('an unknown transaction is not found', async () => {
    const repository = createFakeTransactionRepository()

    const result = await deleteTransaction(
      { id: generateEntityId(), organizationId: 'org_a' },
      repository,
    )

    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error.code).toBe('transaction_not_found')
  })
})
