import { validateAnalyticsSearch } from '@features/analytics'
import { DashboardPage } from '@features/dashboard'
import { createFileRoute, redirect } from '@tanstack/react-router'

export const Route = createFileRoute('/(authenticated)/dashboard')({
  beforeLoad: ({ context }) => {
    if (!context.currentOrganization || !context.currentRole) {
      throw redirect({ to: '/onboarding' })
    }
  },
  component: DashboardRoute,
  validateSearch: validateAnalyticsSearch,
})

function DashboardRoute() {
  const { currentOrganization, currentRole, currentUser } = Route.useRouteContext()
  const search = Route.useSearch()
  const navigate = Route.useNavigate()

  if (!currentOrganization || !currentRole) return null

  return (
    <DashboardPage
      onSearchChange={(next) => navigate({ search: next })}
      organization={currentOrganization}
      role={currentRole}
      search={search}
      user={currentUser}
    />
  )
}
