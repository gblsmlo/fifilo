import type { CategoryResponse, CreateCategoryRequest } from '@fifilo/core/categories'
import { api, edenCreated } from '@libs/api-client'

import { normalizeCategoryRequestError } from './errors'

export async function createCategory(payload: CreateCategoryRequest): Promise<CategoryResponse> {
  const result = await api.categories.post(payload)
  const { data, error } = edenCreated<CategoryResponse>(result)

  if (error) throw normalizeCategoryRequestError(error.value, 'Não foi possível criar a categoria.')

  return data
}
