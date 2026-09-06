import type { TopExpensesResponse } from '@fifilo/core/analytics'
import { api } from '@libs/api-client'

import { normalizeAnalyticsRequestError } from './errors'

export interface TopExpensesQuery {
  from: string
  limit?: number
  to: string
}

export async function getTopExpenses(query: TopExpensesQuery): Promise<TopExpensesResponse> {
  const { data, error } = await api.analytics['top-expenses'].get({
    query: { ...query, limit: query.limit ?? 10 },
  })

  if (error) {
    throw normalizeAnalyticsRequestError(
      error.value,
      'Não foi possível carregar os maiores gastos.',
    )
  }

  return data
}
