import type { TransactionResponse, UpdateTransactionRequest } from '@fifilo/core/transactions'
import { toastManager } from '@fifilo/ui/components/toast'
import { useMutation, useQueryClient } from '@tanstack/react-query'

import { transactionFeedback } from '../feedback'
import { TransactionRequestError } from '../http/errors'
import { updateTransaction } from '../http/update-transaction'

/**
 * What the chosen kind needs, and only that: an income and an expense take one
 * account and a category of their own kind, a transfer takes two accounts and
 * no category at all.
 */
export type TransactionChange = { occurredOn?: string } & (
  | { accountId: string; categoryId: string; kind: 'expense' | 'income' }
  | { fromAccountId: string; kind: 'transfer'; toAccountId: string }
)

/**
 * The contract replaces the whole transaction per edit, so a single-field edit
 * rebuilds the command from the row it came from. `version` travels with it: a
 * stale row is refused as `version_conflict` instead of overwriting someone
 * else's edit.
 */
export const toTransactionUpdate = (
  transaction: TransactionResponse,
  change: TransactionChange,
): UpdateTransactionRequest => {
  const leg = transaction.legs[0]

  if (!leg) throw new Error('A transaction with no leg carries no amount to keep.')

  const base = {
    amountMinor: Math.abs(leg.amountMinor),
    description: transaction.description,
    notes: transaction.notes,
    occurredOn: change.occurredOn ?? transaction.occurredOn,
    version: transaction.version,
  }

  return change.kind === 'transfer'
    ? {
        ...base,
        fromAccountId: change.fromAccountId,
        kind: 'transfer',
        toAccountId: change.toAccountId,
      }
    : { ...base, accountId: change.accountId, categoryId: change.categoryId, kind: change.kind }
}

export function useUpdateTransaction() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      change,
      transaction,
    }: {
      change: TransactionChange
      transaction: TransactionResponse
    }) => updateTransaction(transaction.id, toTransactionUpdate(transaction, change)),
    onError: (error) => {
      const message =
        error instanceof TransactionRequestError
          ? error.message
          : 'Não foi possível editar a transação.'
      toastManager.add(transactionFeedback.update.failure(message))
    },
    onSuccess: async () => {
      toastManager.add(transactionFeedback.update.success)
      await queryClient.invalidateQueries({ queryKey: ['transactions'] })
      await queryClient.invalidateQueries({ queryKey: ['accounts', 'balances'] })
    },
  })
}
