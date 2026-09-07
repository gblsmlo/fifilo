import {
  SettingsPage,
  userPreferencesQueryOptions,
  workspaceSettingsQueryOptions,
} from '@features/settings'
import { createFileRoute, redirect } from '@tanstack/react-router'

export const Route = createFileRoute('/(authenticated)/settings')({
  beforeLoad: ({ context }) => {
    if (!context.currentOrganization || !context.currentRole) {
      throw redirect({ to: '/onboarding' })
    }
  },
  component: SettingsRoute,
  loader: ({ context }) =>
    Promise.all([
      context.queryClient.ensureQueryData(workspaceSettingsQueryOptions()),
      context.queryClient.ensureQueryData(userPreferencesQueryOptions()),
    ]),
})

function SettingsRoute() {
  const { currentRole } = Route.useRouteContext()

  if (!currentRole) return null

  return <SettingsPage role={currentRole} />
}
