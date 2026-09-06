import type { CategoryRepository } from '@fifilo/core/categories'

import { createCategoriesRepository } from './categories-persistence'

/** Composition root only (Decision 003): no SQL or persistence rule lives here. */
export const createCategoryRepository = (): CategoryRepository => createCategoriesRepository()
