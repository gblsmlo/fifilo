import type { AttachCreditCardRequest, CreditCardResponse } from '@fifilo/core/credit-cards'
import { api, edenCreated } from '@libs/api-client'

import { normalizeCreditCardRequestError } from './errors'

export async function attachCreditCard(
  accountId: string,
  payload: AttachCreditCardRequest,
): Promise<CreditCardResponse> {
  const result = await api.accounts({ id: accountId })['credit-card'].post(payload)
  const { data, error } = edenCreated<CreditCardResponse>(result)

  if (error) {
    throw normalizeCreditCardRequestError(error.value, 'Não foi possível cadastrar o cartão.')
  }

  return data
}
