import { loadAuthenticatedRoute } from '@features/auth/route-guard'
import { onboardingStatusQueryOptions, resolveOnboardingProgress } from '@features/onboarding'
import { clientEnv } from '@fifilo/infra-env/client'
import { useQuery } from '@tanstack/react-query'
import { Outlet, createFileRoute, useLocation } from '@tanstack/react-router'

import { OnboardingLayout } from '../../layouts'

export const Route = createFileRoute('/(onboarding)')({
  beforeLoad: ({ location }) => loadAuthenticatedRoute(location.href),
  component: OnboardingRoute,
})

function OnboardingRoute() {
  const { pathname } = useLocation()
  // Only the setup has a status to read: organization creation runs before one
  // exists, and the invitation journey belongs to another workspace's actor.
  const { data } = useQuery({
    ...onboardingStatusQueryOptions(),
    enabled: pathname.startsWith('/onboarding/setup'),
  })

  return (
    <OnboardingLayout
      appName={clientEnv.VITE_APP_NAME}
      progress={resolveOnboardingProgress(pathname, data)}
    >
      <Outlet />
    </OnboardingLayout>
  )
}
