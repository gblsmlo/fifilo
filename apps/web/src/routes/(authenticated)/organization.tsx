import { OrganizationPage } from '@features/organizations'
import { createFileRoute, redirect } from '@tanstack/react-router'

export const Route = createFileRoute('/(authenticated)/organization')({
  beforeLoad: ({ context }) => {
    if (!context.currentOrganization || !context.currentRole) {
      throw redirect({ to: '/onboarding' })
    }
  },
  component: OrganizationRoute,
})

function OrganizationRoute() {
  const { currentOrganization, currentRole } = Route.useRouteContext()

  if (!currentOrganization || !currentRole) return null

  return <OrganizationPage organization={currentOrganization} role={currentRole} />
}
