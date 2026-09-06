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

  return <TransactionsPage onSearchChange={(next) => navigate({ search: next })} search={search} />
}
