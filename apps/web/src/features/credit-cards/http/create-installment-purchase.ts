import type { CreateInstallmentPurchaseRequest } from '@fifilo/core/credit-cards'
import { api, edenCreated } from '@libs/api-client'

import { normalizeCreditCardRequestError } from './errors'

export async function createInstallmentPurchase(
  payload: CreateInstallmentPurchaseRequest,
): Promise<{ transactionIds: string[] }> {
  const result = await api.transactions.installments.post(payload)
  const { data, error } = edenCreated<{ transactionIds: string[] }>(result)

  if (error) {
    throw normalizeCreditCardRequestError(error.value, 'Não foi possível registrar a compra.')
  }

  return data
}
