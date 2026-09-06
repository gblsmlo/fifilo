import type { AccountResponse, CreateAccountRequest } from '@fifilo/core/accounts'
import { api, edenCreated } from '@libs/api-client'

import { normalizeAccountRequestError } from './errors'

export async function createAccount(payload: CreateAccountRequest): Promise<AccountResponse> {
  const result = await api.accounts.post(payload)
  const { data, error } = edenCreated<AccountResponse>(result)

  if (error) throw normalizeAccountRequestError(error.value, 'Não foi possível criar a conta.')

  return data
}
