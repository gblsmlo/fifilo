import { describe, expect, test } from 'bun:test'
import type { TransactionResponse } from '@fifilo/core/transactions'

import { toTransactionUpdate } from './use-update-transaction'

const expense: TransactionResponse = {
  categoryId: 'cat_market',
  createdAt: '2026-09-20T12:00:00.000Z',
  description: 'Supermercado',
  id: 'txn_1',
  kind: 'expense',
  legs: [{ accountId: 'acc_checking', amountMinor: -5_000 }],
  notes: null,
  occurredOn: '2026-09-20',
  organizationId: 'org_1',
  updatedAt: '2026-09-20T12:00:00.000Z',
  version: 3,
}

describe('toTransactionUpdate', () => {
  test('rebuilds the whole command from the row, carrying its version', () => {
    expect(
      toTransactionUpdate(expense, {
        accountId: 'acc_checking',
        categoryId: 'cat_transport',
        kind: 'expense',
      }),
    ).toEqual({
      accountId: 'acc_checking',
      amountMinor: 5_000,
      categoryId: 'cat_transport',
      description: 'Supermercado',
      kind: 'expense',
      notes: null,
      occurredOn: '2026-09-20',
      version: 3,
    })
  })

  test('the contract takes a positive amount, and an expense leg is negative', () => {
    expect(
      toTransactionUpdate(expense, {
        accountId: 'acc_checking',
        categoryId: 'cat_salary',
        kind: 'income',
      }).amountMinor,
    ).toBe(5_000)
  })

  test('a transfer takes two accounts and drops the category', () => {
    expect(
      toTransactionUpdate(expense, {
        fromAccountId: 'acc_checking',
        kind: 'transfer',
        toAccountId: 'acc_wallet',
      }),
    ).toEqual({
      amountMinor: 5_000,
      description: 'Supermercado',
      fromAccountId: 'acc_checking',
      kind: 'transfer',
      notes: null,
      occurredOn: '2026-09-20',
      toAccountId: 'acc_wallet',
      version: 3,
    })
  })

  test('a transfer keeps its amount when it becomes an expense', () => {
    const transfer: TransactionResponse = {
      ...expense,
      categoryId: null,
      kind: 'transfer',
      legs: [
        { accountId: 'acc_checking', amountMinor: -2_000 },
        { accountId: 'acc_wallet', amountMinor: 2_000 },
      ],
    }

    expect(
      toTransactionUpdate(transfer, {
        accountId: 'acc_checking',
        categoryId: 'cat_market',
        kind: 'expense',
      }).amountMinor,
    ).toBe(2_000)
  })
})
