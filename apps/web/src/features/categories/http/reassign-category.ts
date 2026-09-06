import type { CategoryResponse, ReassignCategoryRequest } from '@fifilo/core/categories'
import { api } from '@libs/api-client'

import { normalizeCategoryRequestError } from './errors'

export async function reassignCategory(
  id: string,
  payload: ReassignCategoryRequest,
): Promise<CategoryResponse> {
  const { data, error } = await api.categories({ id }).reassign.post(payload)

  if (error) {
    throw normalizeCategoryRequestError(error.value, 'Não foi possível reatribuir a categoria.')
  }

  return data
}
