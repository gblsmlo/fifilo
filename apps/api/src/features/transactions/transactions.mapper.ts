import type { Transaction, TransactionResponse } from '@fifilo/core/transactions'

export const toTransactionResponse = (transaction: Transaction): TransactionResponse => ({
  categoryId: transaction.categoryId,
  createdAt: transaction.createdAt.toISOString(),
  description: transaction.description,
  id: transaction.id,
  kind: transaction.kind,
  legs: transaction.legs.map((leg) => ({
    accountId: leg.accountId,
    amountMinor: leg.amountMinor,
  })),
  notes: transaction.notes,
  occurredOn: transaction.occurredOn,
  organizationId: transaction.organizationId,
  updatedAt: transaction.updatedAt.toISOString(),
  version: transaction.version,
})
