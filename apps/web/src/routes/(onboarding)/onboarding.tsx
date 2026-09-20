import { OrganizationOnboardingPage } from '@features/organizations'
import { Navigate, Outlet, createFileRoute, useLocation } from '@tanstack/react-router'

export const Route = createFileRoute('/(onboarding)/onboarding')({
  component: OnboardingRoute,
})

function OnboardingRoute() {
  const location = useLocation()
  const { currentOrganization } = Route.useRouteContext()

  if (location.pathname === '/onboarding') {
    if (currentOrganization) return <Navigate to='/dashboard' />
    return <OrganizationOnboardingPage />
  }

  return <Outlet />
}
