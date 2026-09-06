import { loadAuthenticatedRoute } from '@features/auth/route-guard'
import { Outlet, createFileRoute } from '@tanstack/react-router'
import { AppLayout } from '../../layouts'

export const Route = createFileRoute('/(authenticated)')({
  beforeLoad: ({ location }) => loadAuthenticatedRoute(location.href),
  component: AuthenticatedRoute,
})

function AuthenticatedRoute() {
  const { currentOrganization, currentUser } = Route.useRouteContext()

  return (
    <AppLayout organizationName={currentOrganization?.name} userName={currentUser.name}>
      <Outlet />
    </AppLayout>
  )
}
