import type { CategoryResponse, UpdateCategoryRequest } from '@fifilo/core/categories'
import { api } from '@libs/api-client'

import { normalizeCategoryRequestError } from './errors'

export async function updateCategory(
  id: string,
  payload: UpdateCategoryRequest,
): Promise<CategoryResponse> {
  const { data, error } = await api.categories({ id }).patch(payload)

  if (error)
    throw normalizeCategoryRequestError(error.value, 'Não foi possível editar a categoria.')

  return data
}
