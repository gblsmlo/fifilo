import type { AccountBalancesResponse } from '@fifilo/core/accounts'
import { api } from '@libs/api-client'

import { normalizeAccountRequestError } from './errors'

export async function getBalances(): Promise<AccountBalancesResponse> {
  const { data, error } = await api.accounts.balances.get()

  if (error) {
    throw normalizeAccountRequestError(error.value, 'Não foi possível carregar os saldos.')
  }

  return data
}
