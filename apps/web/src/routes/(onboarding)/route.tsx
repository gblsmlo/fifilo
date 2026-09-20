import { loadAuthenticatedRoute } from '@features/auth/route-guard'
import { clientEnv } from '@fifilo/infra-env/client'
import { Outlet, createFileRoute } from '@tanstack/react-router'

import { OnboardingLayout } from '../../layouts'

export const Route = createFileRoute('/(onboarding)')({
  beforeLoad: ({ location }) => loadAuthenticatedRoute(location.href),
  component: OnboardingRoute,
})

function OnboardingRoute() {
  return (
    <OnboardingLayout appName={clientEnv.VITE_APP_NAME} progress='Configuração inicial'>
      <Outlet />
    </OnboardingLayout>
  )
}
