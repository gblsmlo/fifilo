import type { TransactionResponse, UpdateTransactionRequest } from '@fifilo/core/transactions'
import { api } from '@libs/api-client'

import { normalizeTransactionRequestError } from './errors'

export async function updateTransaction(
  id: string,
  payload: UpdateTransactionRequest,
): Promise<TransactionResponse> {
  const { data, error } = await api.transactions({ id }).patch(payload)

  if (error) {
    throw normalizeTransactionRequestError(error.value, 'Não foi possível editar a transação.')
  }

  return data
}
