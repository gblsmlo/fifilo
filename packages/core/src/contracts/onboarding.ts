import { z } from 'zod'

export const financialOnboardingStatusSchema = z.object({
  organizationId: z.string().min(1),
  eligible: z.boolean(),
  dismissed: z.boolean(),
  complete: z.boolean(),
  reminderVisible: z.boolean(),
  steps: z.object({
    workspaceSettings: z.boolean(),
    firstAccount: z.boolean(),
  }),
})

export type FinancialOnboardingStatus = z.infer<typeof financialOnboardingStatusSchema>

/**
 * How many default categories the call wrote. Zero is the normal answer for
 * every call after the first, and the caller treats it the same as thirteen.
 */
export const startFinancialOnboardingResponseSchema = z.object({
  seeded: z.int().min(0),
})

export type StartFinancialOnboardingResponse = z.infer<
  typeof startFinancialOnboardingResponseSchema
>
