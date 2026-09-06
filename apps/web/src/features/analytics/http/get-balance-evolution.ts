import type { BalanceEvolutionResponse } from '@fifilo/core/analytics'
import { api } from '@libs/api-client'

import { normalizeAnalyticsRequestError } from './errors'

export interface BalanceEvolutionQuery {
  accountId?: string
  from: string
  to: string
}

export async function getBalanceEvolution(
  query: BalanceEvolutionQuery,
): Promise<BalanceEvolutionResponse> {
  const { data, error } = await api.analytics['balance-evolution'].get({ query })

  if (error) {
    throw normalizeAnalyticsRequestError(
      error.value,
      'Não foi possível carregar a evolução de saldo.',
    )
  }

  return data
}
