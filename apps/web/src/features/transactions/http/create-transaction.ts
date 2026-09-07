import type { CreateTransactionRequest, TransactionResponse } from '@fifilo/core/transactions'
import { api, edenCreated } from '@libs/api-client'

import { normalizeTransactionRequestError } from './errors'

/**
 * `idempotencyKey` is required, not optional (Fase 06 audit, NFR-05): a
 * duplicated click or a retried request must never double a financial
 * movement, the same guarantee `payInvoice` already enforces.
 */
export async function createTransaction(
  payload: CreateTransactionRequest,
  idempotencyKey: string,
): Promise<TransactionResponse> {
  const result = await api.transactions.post(payload, {
    headers: { 'idempotency-key': idempotencyKey },
  })
  const { data, error } = edenCreated<TransactionResponse>(result)

  if (error) {
    throw normalizeTransactionRequestError(error.value, 'Não foi possível registrar a transação.')
  }

  return data
}
