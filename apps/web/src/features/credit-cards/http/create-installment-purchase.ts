import type { CreateInstallmentPurchaseRequest } from '@fifilo/core/credit-cards'
import { api, edenCreated } from '@libs/api-client'

import { normalizeCreditCardRequestError } from './errors'

/**
 * `idempotencyKey` is required (Fase 06 audit, NFR-05): a retried request
 * must not double the whole purchase's N transactions.
 */
export async function createInstallmentPurchase(
  payload: CreateInstallmentPurchaseRequest,
  idempotencyKey: string,
): Promise<{ transactionIds: string[] }> {
  const result = await api.transactions.installments.post(payload, {
    headers: { 'idempotency-key': idempotencyKey },
  })
  const { data, error } = edenCreated<{ transactionIds: string[] }>(result)

  if (error) {
    throw normalizeCreditCardRequestError(error.value, 'Não foi possível registrar a compra.')
  }

  return data
}
