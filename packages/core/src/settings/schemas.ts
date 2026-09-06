import { z } from 'zod'

import { currencyCodeSchema } from '../contracts/money'

const weekStartSchema = z.enum(['monday', 'sunday'])

export const workspaceSettingsResponseSchema = z.object({
  currency: currencyCodeSchema,
  locale: z.string().min(2),
  monthStartDay: z.int().min(1).max(28),
  organizationId: z.string().min(1),
  timezone: z.string().min(1),
  updatedAt: z.iso.datetime().nullable(),
  version: z.int(),
  weekStartsOn: weekStartSchema,
})

export const updateWorkspaceSettingsRequestSchema = z.object({
  currency: currencyCodeSchema.optional(),
  locale: z.string().min(2).optional(),
  monthStartDay: z.int().min(1).max(28).optional(),
  timezone: z.string().min(1).optional(),
  version: z.int().min(0),
  weekStartsOn: weekStartSchema.optional(),
})

const themeSchema = z.enum(['dark', 'light', 'system'])
const densitySchema = z.enum(['comfortable', 'compact'])

export const userPreferencesResponseSchema = z.object({
  density: densitySchema,
  notifyByEmail: z.boolean(),
  organizationId: z.string().min(1),
  theme: themeSchema,
  updatedAt: z.iso.datetime().nullable(),
  userId: z.string().min(1),
  version: z.int(),
})

export const updateUserPreferencesRequestSchema = z.object({
  density: densitySchema.optional(),
  notifyByEmail: z.boolean().optional(),
  theme: themeSchema.optional(),
  version: z.int().min(0),
})

const settingsErrorCodeSchema = z.enum([
  'currency_locked',
  'insufficient_role',
  'invalid_month_start_day',
  'version_conflict',
])

export const settingsErrorResponseSchema = z.object({
  error: z.object({
    code: settingsErrorCodeSchema,
    message: z.string().min(1),
  }),
})

export type WorkspaceSettingsResponse = z.infer<typeof workspaceSettingsResponseSchema>
export type UpdateWorkspaceSettingsRequest = z.infer<typeof updateWorkspaceSettingsRequestSchema>
export type UserPreferencesResponse = z.infer<typeof userPreferencesResponseSchema>
export type UpdateUserPreferencesRequest = z.infer<typeof updateUserPreferencesRequestSchema>
export type SettingsErrorResponse = z.infer<typeof settingsErrorResponseSchema>
