export type FinancialOnboardingProgress = {
  dismissedAt: Date | null
  organizationId: string
  userId: string
}

export type FinancialOnboardingProgressRepository = {
  findByUser: (
    organizationId: string,
    userId: string,
  ) => Promise<FinancialOnboardingProgress | null>
  dismiss: (organizationId: string, userId: string) => Promise<void>
}
