import { updateAccountRequestSchema } from '@fifilo/core/accounts'
import type { z } from 'zod'

/**
 * Editing never changes the kind: the balance already booked under it would
 * change meaning, and the contract leaves `kind` out of the patch.
 */
export const accountEditFormSchema = updateAccountRequestSchema.pick({
  institution: true,
  name: true,
})

export type AccountEditFormInput = z.input<typeof accountEditFormSchema>
export type AccountEditFormValues = z.infer<typeof accountEditFormSchema>
