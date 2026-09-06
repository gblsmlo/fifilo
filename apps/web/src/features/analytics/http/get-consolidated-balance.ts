import type { ConsolidatedBalanceResponse } from '@fifilo/core/analytics'
import { api } from '@libs/api-client'

import { normalizeAnalyticsRequestError } from './errors'

export interface ConsolidatedBalanceQuery {
  asOf: string
}

export async function getConsolidatedBalance(
  query: ConsolidatedBalanceQuery,
): Promise<ConsolidatedBalanceResponse> {
  const { data, error } = await api.analytics['consolidated-balance'].get({ query })

  if (error) {
    throw normalizeAnalyticsRequestError(
      error.value,
      'Não foi possível carregar o saldo consolidado.',
    )
  }

  return data
}
