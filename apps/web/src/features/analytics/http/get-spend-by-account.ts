import type { SpendByAccountResponse } from '@fifilo/core/analytics'
import { api } from '@libs/api-client'

import { normalizeAnalyticsRequestError } from './errors'

export interface SpendByAccountQuery {
  from: string
  to: string
}

export async function getSpendByAccount(
  query: SpendByAccountQuery,
): Promise<SpendByAccountResponse> {
  const { data, error } = await api.analytics['spend-by-account'].get({ query })

  if (error) {
    throw normalizeAnalyticsRequestError(
      error.value,
      'Não foi possível carregar o gasto por conta.',
    )
  }

  return data
}
