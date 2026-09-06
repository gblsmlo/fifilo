import type { AccountResponse, UpdateAccountRequest } from '@fifilo/core/accounts'
import { api } from '@libs/api-client'

import { normalizeAccountRequestError } from './errors'

export async function updateAccount(
  id: string,
  payload: UpdateAccountRequest,
): Promise<AccountResponse> {
  const { data, error } = await api.accounts({ id }).patch(payload)

  if (error) throw normalizeAccountRequestError(error.value, 'Não foi possível editar a conta.')

  return data
}
