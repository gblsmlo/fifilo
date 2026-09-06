import type { AvailableLimitResponse } from '@fifilo/core/credit-cards'
import { api } from '@libs/api-client'

import { normalizeCreditCardRequestError } from './errors'

export async function getAvailableLimit(accountId: string): Promise<AvailableLimitResponse> {
  const { data, error } = await api['credit-cards']({ id: accountId })['available-limit'].get()

  if (error) {
    throw normalizeCreditCardRequestError(error.value, 'Não foi possível carregar o limite.')
  }

  return data
}
