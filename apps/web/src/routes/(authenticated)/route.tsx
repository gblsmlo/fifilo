import { loadAuthenticatedRoute } from '@features/auth/route-guard'
import { userPreferencesQueryOptions } from '@features/settings'
import { useQuery } from '@tanstack/react-query'
import { Outlet, createFileRoute } from '@tanstack/react-router'
import { AppLayout } from '../../layouts'

export const Route = createFileRoute('/(authenticated)')({
  beforeLoad: ({ location }) => loadAuthenticatedRoute(location.href),
  component: AuthenticatedRoute,
})

function AuthenticatedRoute() {
  const { currentOrganization, currentUser } = Route.useRouteContext()
  // Preferences are keyed by (organization, user) - no organization yet
  // (still onboarding) means no theme preference to apply.
  const preferencesQuery = useQuery({
    ...userPreferencesQueryOptions(),
    enabled: Boolean(currentOrganization),
  })

  return (
    <AppLayout
      organizationName={currentOrganization?.name}
      theme={preferencesQuery.data?.theme}
      userName={currentUser.name}
    >
      <Outlet />
    </AppLayout>
  )
}
