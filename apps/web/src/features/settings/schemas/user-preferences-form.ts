import { updateUserPreferencesRequestSchema } from '@fifilo/core/settings'
import type { z } from 'zod'

/** Same reasoning as `workspace-settings-form.ts`: the form always shows and submits every field. */
export const userPreferencesFormSchema = updateUserPreferencesRequestSchema.required()

export type UserPreferencesFormInput = z.input<typeof userPreferencesFormSchema>
export type UserPreferencesFormValues = z.infer<typeof userPreferencesFormSchema>
