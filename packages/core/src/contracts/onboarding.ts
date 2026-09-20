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
