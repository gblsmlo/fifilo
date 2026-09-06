import { AccountsPage, accountBalancesQueryOptions, accountsQueryOptions } from '@features/accounts'
import { createFileRoute, redirect } from '@tanstack/react-router'

export const Route = createFileRoute('/(authenticated)/accounts')({
  beforeLoad: ({ context }) => {
    if (!context.currentOrganization || !context.currentRole) {
      throw redirect({ to: '/onboarding' })
    }
  },
  component: AccountsPage,
  loader: ({ context }) =>
    Promise.all([
      context.queryClient.ensureQueryData(accountsQueryOptions()),
      context.queryClient.ensureQueryData(accountBalancesQueryOptions()),
    ]),
})
