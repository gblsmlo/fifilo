import type { TransactionsPageResponse } from '@fifilo/core/transactions'
import { api } from '@libs/api-client'

import { normalizeTransactionRequestError } from './errors'

export interface ListTransactionsFilter {
  accountId?: string
  categoryId?: string
  cursor?: string
  from?: string
  kind?: 'income' | 'expense' | 'transfer'
  limit?: number
  q?: string
  to?: string
}

export async function listTransactions(
  filter: ListTransactionsFilter = {},
): Promise<TransactionsPageResponse> {
  const { data, error } = await api.transactions.get({
    query: { ...filter, limit: filter.limit ?? 20 },
  })

  if (error) {
    throw normalizeTransactionRequestError(error.value, 'Não foi possível listar as transações.')
  }

  return data
}
