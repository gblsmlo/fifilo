import { FinancialOnboardingPage, onboardingStatusQueryOptions } from '@features/onboarding'
import { createFileRoute, redirect } from '@tanstack/react-router'

export const Route = createFileRoute('/(onboarding)/onboarding/setup')({
  beforeLoad: ({ context }) => {
    if (!context.currentOrganization) throw redirect({ to: '/onboarding' })
  },
  component: FinancialOnboardingPage,
  loader: async ({ context }) => {
    const status = await context.queryClient.ensureQueryData(onboardingStatusQueryOptions())
    if (!status.eligible || status.complete) throw redirect({ to: '/dashboard' })
  },
})
