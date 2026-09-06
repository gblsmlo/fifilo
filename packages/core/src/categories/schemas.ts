import { z } from 'zod'

export const categoryKindSchema = z.enum(['income', 'expense'])

const categoryNameSchema = z.string().trim().min(1, 'Informe o nome da categoria.').max(120)
const categoryColorSchema = z.string().trim().min(1).max(32).nullable()
const categoryIconSchema = z.string().trim().min(1).max(64).nullable()

export const categoryResponseSchema = z.object({
  archivedAt: z.string().datetime().nullable(),
  color: categoryColorSchema,
  icon: categoryIconSchema,
  id: z.string().min(1),
  kind: categoryKindSchema,
  name: categoryNameSchema,
  organizationId: z.string().min(1),
  parentId: z.string().min(1).nullable(),
  version: z.int().min(1),
})

export const createCategoryRequestObjectSchema = z.object({
  color: categoryColorSchema.optional(),
  icon: categoryIconSchema.optional(),
  kind: categoryKindSchema,
  name: categoryNameSchema,
  parentId: z.string().min(1).nullable().optional(),
})

export const createCategoryRequestSchema = createCategoryRequestObjectSchema

export const updateCategoryRequestSchema = z.object({
  color: categoryColorSchema.optional(),
  icon: categoryIconSchema.optional(),
  name: categoryNameSchema.optional(),
  version: z.int().min(1),
})

/**
 * `targetCategoryId` is required only when the category being closed still
 * has transactions - a category created by mistake, with nothing pointing at
 * it, just archives (Fase 02 § Modelagem). The route validates the pair, not
 * the use case, so the 422 lands at the boundary (Decision 002).
 */
export const reassignCategoryRequestSchema = z.object({
  targetCategoryId: z.string().min(1).optional(),
})

export const listCategoriesQuerySchema = z.object({
  includeArchived: z
    .preprocess(
      (value) => (typeof value === 'string' ? value.toLowerCase() === 'true' : value),
      z.boolean(),
    )
    .default(false),
})

const categoryErrorCodeSchema = z.enum([
  'category_name_taken',
  'category_not_found',
  'invalid_category_kind',
  'invalid_target_category',
  'target_category_required',
  'version_conflict',
])

export const categoryErrorResponseSchema = z.object({
  error: z.object({
    code: categoryErrorCodeSchema,
    message: z.string().min(1),
  }),
})

export type CategoryKind = z.infer<typeof categoryKindSchema>
export type CategoryResponse = z.infer<typeof categoryResponseSchema>
export type CreateCategoryRequest = z.infer<typeof createCategoryRequestSchema>
export type UpdateCategoryRequest = z.infer<typeof updateCategoryRequestSchema>
export type ReassignCategoryRequest = z.infer<typeof reassignCategoryRequestSchema>
export type ListCategoriesQuery = z.infer<typeof listCategoriesQuerySchema>
export type CategoryErrorResponse = z.infer<typeof categoryErrorResponseSchema>
