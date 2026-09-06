import type { SpendByCategoryResponse } from '@fifilo/core/analytics'
import { api } from '@libs/api-client'

import { normalizeAnalyticsRequestError } from './errors'

export interface SpendByCategoryQuery {
  from: string
  kind: 'expense' | 'income'
  to: string
}

export async function getSpendByCategory(
  query: SpendByCategoryQuery,
): Promise<SpendByCategoryResponse> {
  const { data, error } = await api.analytics['spend-by-category'].get({ query })

  if (error) {
    throw normalizeAnalyticsRequestError(
      error.value,
      'Não foi possível carregar o gasto por categoria.',
    )
  }

  return data
}
