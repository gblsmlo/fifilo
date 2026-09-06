import { describe, expect, test } from 'bun:test'

import { generateEntityId } from '../../primitives'
import { createTransaction } from './create-transaction'
import {
  createFakeAccountLookup,
  createFakeCategoryLookup,
  createFakeTransactionRepository,
} from './fake-transaction-repository'

const orgId = 'org_a'
const checking = { archivedAt: null, currency: 'BRL' as const, id: generateEntityId() }
const savings = { archivedAt: null, currency: 'BRL' as const, id: generateEntityId() }
const archivedAccount = { archivedAt: new Date(), currency: 'BRL' as const, id: generateEntityId() }
const usdAccount = { archivedAt: null, currency: 'USD' as const, id: generateEntityId() }
const groceries = { archivedAt: null, id: generateEntityId(), kind: 'expense' as const }
const salary = { archivedAt: null, id: generateEntityId(), kind: 'income' as const }

const accounts = createFakeAccountLookup([checking, savings, archivedAccount, usdAccount])
const categories = createFakeCategoryLookup([groceries, salary])

describe('createTransaction', () => {
  test('creates an expense with one negative leg', async () => {
    const repository = createFakeTransactionRepository()

    const result = await createTransaction(
      {
        accountId: checking.id,
        amountMinor: 5_000,
        categoryId: groceries.id,
        description: 'Supermercado',
        kind: 'expense',
        notes: null,
        occurredOn: '2026-01-15',
        organizationId: orgId,
        userId: generateEntityId(),
      },
      repository,
      accounts,
      categories,
    )

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(repository.legsByTransactionId.get(result.value.id)).toEqual([
      { accountId: checking.id, amountMinor: -5_000, id: expect.any(String) },
    ])
  })

  test('creates a transfer with two opposite legs', async () => {
    const repository = createFakeTransactionRepository()

    const result = await createTransaction(
      {
        amountMinor: 10_000,
        description: 'Reserva mensal',
        fromAccountId: checking.id,
        kind: 'transfer',
        notes: null,
        occurredOn: '2026-01-15',
        organizationId: orgId,
        toAccountId: savings.id,
        userId: generateEntityId(),
      },
      repository,
      accounts,
      categories,
    )

    expect(result.ok).toBe(true)
    if (!result.ok) return
    const legs = repository.legsByTransactionId.get(result.value.id) ?? []
    expect(legs.reduce((sum, leg) => sum + leg.amountMinor, 0)).toBe(0)
  })

  test('rejects a category whose kind does not match the transaction', async () => {
    const repository = createFakeTransactionRepository()

    const result = await createTransaction(
      {
        accountId: checking.id,
        amountMinor: 5_000,
        categoryId: salary.id,
        description: 'Compra',
        kind: 'expense',
        notes: null,
        occurredOn: '2026-01-15',
        organizationId: orgId,
        userId: generateEntityId(),
      },
      repository,
      accounts,
      categories,
    )

    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error.code).toBe('category_kind_mismatch')
  })

  test('rejects a transfer between accounts of different currencies', async () => {
    const repository = createFakeTransactionRepository()

    const result = await createTransaction(
      {
        amountMinor: 5_000,
        description: 'Câmbio',
        fromAccountId: checking.id,
        kind: 'transfer',
        notes: null,
        occurredOn: '2026-01-15',
        organizationId: orgId,
        toAccountId: usdAccount.id,
        userId: generateEntityId(),
      },
      repository,
      accounts,
      categories,
    )

    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error.code).toBe('currency_mismatch')
  })

  test('rejects an entry into an archived account', async () => {
    const repository = createFakeTransactionRepository()

    const result = await createTransaction(
      {
        accountId: archivedAccount.id,
        amountMinor: 5_000,
        categoryId: groceries.id,
        description: 'Compra',
        kind: 'expense',
        notes: null,
        occurredOn: '2026-01-15',
        organizationId: orgId,
        userId: generateEntityId(),
      },
      repository,
      accounts,
      categories,
    )

    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error.code).toBe('account_archived')
  })
})
