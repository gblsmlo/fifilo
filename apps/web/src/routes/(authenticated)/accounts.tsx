import { AccountsPage, accountBalancesQueryOptions, accountsQueryOptions } from '@features/accounts'
import { workspaceSettingsQueryOptions } from '@features/settings'
import { createFileRoute, redirect } from '@tanstack/react-router'

export const Route = createFileRoute('/(authenticated)/accounts')({
  beforeLoad: ({ context }) => {
    if (!context.currentOrganization || !context.currentRole) {
      throw redirect({ to: '/onboarding' })
    }
  },
  component: AccountsPage,
  // The create form reads `workspace_settings.timezone` to date the opening
  // balance, and refuses to render on a guess. Resolving it here keeps the
  // dialog from mounting empty and remounting once the setting lands.
  loader: ({ context }) =>
    Promise.all([
      context.queryClient.ensureQueryData(accountsQueryOptions()),
      context.queryClient.ensureQueryData(accountBalancesQueryOptions()),
      context.queryClient.ensureQueryData(workspaceSettingsQueryOptions()),
    ]),
})
