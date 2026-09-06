import type { AccountResponse } from '@fifilo/core/accounts'
import { api } from '@libs/api-client'

import { normalizeAccountRequestError } from './errors'

export async function archiveAccount(id: string): Promise<AccountResponse> {
  const { data, error } = await api.accounts({ id }).archive.post()

  if (error) throw normalizeAccountRequestError(error.value, 'Não foi possível arquivar a conta.')

  return data
}
