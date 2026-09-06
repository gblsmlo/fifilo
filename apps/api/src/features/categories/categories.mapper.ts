import type { Category, CategoryResponse } from '@fifilo/core/categories'

export const toCategoryResponse = (category: Category): CategoryResponse => ({
  archivedAt: category.archivedAt?.toISOString() ?? null,
  color: category.color,
  icon: category.icon,
  id: category.id,
  kind: category.kind,
  name: category.name,
  organizationId: category.organizationId,
  parentId: category.parentId,
  version: category.version,
})
