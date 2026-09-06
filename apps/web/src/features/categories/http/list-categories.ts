import type { CategoryResponse } from '@fifilo/core/categories'
import { api } from '@libs/api-client'

import { normalizeCategoryRequestError } from './errors'

export async function listCategories(
  options: { includeArchived?: boolean } = {},
): Promise<CategoryResponse[]> {
  const { data, error } = await api.categories.get({
    query: { includeArchived: options.includeArchived ?? false },
  })

  if (error) {
    throw normalizeCategoryRequestError(error.value, 'Não foi possível listar as categorias.')
  }

  return data
}
