import { FinancialOnboardingPage, onboardingStatusQueryOptions } from '@features/onboarding'
import { workspaceSettingsQueryOptions } from '@features/settings'
import { createFileRoute, redirect } from '@tanstack/react-router'

export const Route = createFileRoute('/(onboarding)/onboarding/setup')({
  beforeLoad: ({ context }) => {
    if (!context.currentOrganization) throw redirect({ to: '/onboarding' })
  },
  component: FinancialOnboardingPage,
  loader: async ({ context }) => {
    const status = await context.queryClient.ensureQueryData(onboardingStatusQueryOptions())
    if (!status.eligible || status.complete) throw redirect({ to: '/dashboard' })
    // Resuming straight into the account step skips the settings form, which
    // is what would otherwise have put this in the cache.
    await context.queryClient.ensureQueryData(workspaceSettingsQueryOptions())
  },
})
