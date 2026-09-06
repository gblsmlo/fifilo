import type { CategoryResponse } from '@fifilo/core/categories'
import { generateEntityId } from '@fifilo/core/primitives'

/** Mock data for the Categories stories. Server messages here, not product copy. */
export const categoriesStoryFixtures = {
  nameTakenMessage: 'Já existe uma categoria com este nome.',
  unreachableMessage: 'Não foi possível falar com o servidor. Tente novamente.',
} as const

export const buildStoryCategory = (
  overrides: Partial<CategoryResponse> = {},
): CategoryResponse => ({
  archivedAt: null,
  color: null,
  icon: null,
  id: generateEntityId(),
  kind: 'expense',
  name: 'Mercado',
  organizationId: 'org_story',
  parentId: null,
  version: 1,
  ...overrides,
})
