import type { MonthlyCashflowResponse } from '@fifilo/core/analytics'
import { api } from '@libs/api-client'

import { normalizeAnalyticsRequestError } from './errors'

export interface MonthlyCashflowQuery {
  from: string
  to: string
}

export async function getMonthlyCashflow(
  query: MonthlyCashflowQuery,
): Promise<MonthlyCashflowResponse> {
  const { data, error } = await api.analytics['monthly-cashflow'].get({ query })

  if (error) {
    throw normalizeAnalyticsRequestError(error.value, 'Não foi possível carregar o fluxo mensal.')
  }

  return data
}
