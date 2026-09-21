import {
  FinancialOnboardingPage,
  onboardingStatusQueryOptions,
  startOnboarding,
} from '@features/onboarding'
import { workspaceSettingsQueryOptions } from '@features/settings'
import { createFileRoute, redirect } from '@tanstack/react-router'

export const Route = createFileRoute('/(onboarding)/onboarding/setup')({
  beforeLoad: ({ context }) => {
    if (!context.currentOrganization) throw redirect({ to: '/onboarding' })
  },
  component: FinancialOnboardingPage,
  loader: async ({ context }) => {
    // Before the status is read, not after: the progress row it derives
    // eligibility from is exactly what a failed creation hook leaves missing
    // (`BUG-003`), and an ineligible owner would be redirected away from the
    // only place that repairs it.
    await startOnboarding()

    const status = await context.queryClient.ensureQueryData(onboardingStatusQueryOptions())
    if (!status.eligible || status.complete) throw redirect({ to: '/dashboard' })
    // Resuming straight into the account step skips the settings form, which
    // is what would otherwise have put this in the cache.
    await context.queryClient.ensureQueryData(workspaceSettingsQueryOptions())
  },
})
