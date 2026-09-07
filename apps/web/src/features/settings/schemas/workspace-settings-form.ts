import { updateWorkspaceSettingsRequestSchema } from '@fifilo/core/settings'
import type { z } from 'zod'

/**
 * The API's PATCH request schema makes every field but `version` optional
 * (a caller changes only what it means to); the form always shows and
 * submits the full set, seeded from the GET response, so every field is
 * required here instead.
 */
export const workspaceSettingsFormSchema = updateWorkspaceSettingsRequestSchema.required()

export type WorkspaceSettingsFormInput = z.input<typeof workspaceSettingsFormSchema>
export type WorkspaceSettingsFormValues = z.infer<typeof workspaceSettingsFormSchema>
