import { DashboardPage } from '@features/dashboard'
import { createFileRoute, redirect } from '@tanstack/react-router'

export const Route = createFileRoute('/(authenticated)/dashboard')({
  beforeLoad: ({ context }) => {
    if (!context.currentOrganization || !context.currentRole) {
      throw redirect({ to: '/onboarding' })
    }
  },
  component: DashboardRoute,
})

function DashboardRoute() {
  const { currentOrganization, currentRole, currentUser } = Route.useRouteContext()

  if (!currentOrganization || !currentRole) return null

  return <DashboardPage organization={currentOrganization} role={currentRole} user={currentUser} />
}
