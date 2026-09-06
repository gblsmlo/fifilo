import { createCategoryRequestObjectSchema } from '@fifilo/core/categories'
import type { z } from 'zod'

/**
 * Color and icon are part of the contract but this form does not expose them
 * yet: a picker for either is its own delivery, not a text field. A category
 * is created plain and can be personalized once that ships.
 */
export const categoryFormSchema = createCategoryRequestObjectSchema.pick({
  kind: true,
  name: true,
  parentId: true,
})

export type CategoryFormInput = z.input<typeof categoryFormSchema>
export type CategoryFormValues = z.infer<typeof categoryFormSchema>
