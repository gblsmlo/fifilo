import type { Category } from '../category'
import type { CategoryRepository } from '../ports'

export type ListCategoriesQuery = {
  includeArchived: boolean
  organizationId: string
}

export const listCategories = (
  query: ListCategoriesQuery,
  repository: CategoryRepository,
): Promise<Category[]> =>
  repository.list(query.organizationId, { includeArchived: query.includeArchived })
