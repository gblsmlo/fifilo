import type { AccountResponse } from '@fifilo/core/accounts'
import { api } from '@libs/api-client'

import { normalizeAccountRequestError } from './errors'

export async function listAccounts(
  options: { includeArchived?: boolean } = {},
): Promise<AccountResponse[]> {
  const { data, error } = await api.accounts.get({
    query: { includeArchived: options.includeArchived ?? false },
  })

  if (error) throw normalizeAccountRequestError(error.value, 'Não foi possível listar as contas.')

  return data
}
