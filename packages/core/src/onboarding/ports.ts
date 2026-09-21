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
  /**
   * Creates the row if it is not there and leaves an existing one untouched,
   * `dismissedAt` included. The workspace-creation hook writes this row on a
   * best-effort basis (`BUG-003`), so the onboarding entry is what actually
   * guarantees it.
   */
  ensure: (organizationId: string, userId: string) => Promise<void>
}
