import type { CreateTransactionRequest, TransactionResponse } from '@fifilo/core/transactions'
import { api, edenCreated } from '@libs/api-client'

import { normalizeTransactionRequestError } from './errors'

export async function createTransaction(
  payload: CreateTransactionRequest,
  idempotencyKey?: string,
): Promise<TransactionResponse> {
  const result = await api.transactions.post(payload, {
    headers: idempotencyKey ? { 'idempotency-key': idempotencyKey } : undefined,
  })
  const { data, error } = edenCreated<TransactionResponse>(result)

  if (error) {
    throw normalizeTransactionRequestError(error.value, 'Não foi possível registrar a transação.')
  }

  return data
}
