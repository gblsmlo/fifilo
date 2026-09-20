import { TransactionsPage, validateTransactionsSearch } from '@features/transactions'
import { createFileRoute, redirect } from '@tanstack/react-router'

export const Route = createFileRoute('/(authenticated)/transactions')({
  beforeLoad: ({ context }) => {
    if (!context.currentOrganization || !context.currentRole) {
      throw redirect({ to: '/onboarding' })
    }
  },
  component: TransactionsRoute,
  validateSearch: validateTransactionsSearch,
})

function TransactionsRoute() {
  const search = Route.useSearch()
  const navigate = Route.useNavigate()

  // A functional update: two filter changes in the same tick must not race
  // over a stale `search` closure and drop each other's param.
  return (
    <TransactionsPage
      onSearchChange={(next) => navigate({ search: (prev) => ({ ...prev, ...next }) })}
      search={search}
    />
  )
}
