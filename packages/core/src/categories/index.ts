export type { Category, CategoryKind } from './category'
export { categoryNameKey, categoryScopeKey, normalizeCategoryName } from './category'
export type {
  CategoryRepository,
  CategoryUpdatePatch,
  NewCategoryRecord,
  UpdateOutcome,
} from './ports'
export type {
  CategoryErrorResponse,
  CategoryResponse,
  CreateCategoryRequest,
  ListCategoriesQuery as ListCategoriesQueryContract,
  ReassignCategoryRequest,
  UpdateCategoryRequest,
} from './schemas'
export {
  categoryErrorResponseSchema,
  categoryKindSchema,
  categoryResponseSchema,
  createCategoryRequestObjectSchema,
  createCategoryRequestSchema,
  listCategoriesQuerySchema,
  reassignCategoryRequestSchema,
  updateCategoryRequestSchema,
} from './schemas'
export type { CreateCategoryCommand, CreateCategoryError } from './use-cases/create-category'
export { createCategory } from './use-cases/create-category'
export type { ListCategoriesQuery } from './use-cases/list-categories'
export { listCategories } from './use-cases/list-categories'
export type { ReassignCategoryCommand, ReassignCategoryError } from './use-cases/reassign-category'
export { reassignCategory } from './use-cases/reassign-category'
export type { UpdateCategoryCommand, UpdateCategoryError } from './use-cases/update-category'
export { updateCategory } from './use-cases/update-category'
