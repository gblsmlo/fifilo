import { CreditCardPage } from '@features/credit-cards'
import { createFileRoute, redirect } from '@tanstack/react-router'

export const Route = createFileRoute('/(authenticated)/credit-cards/$accountId')({
  beforeLoad: ({ context }) => {
    if (!context.currentOrganization || !context.currentRole) {
      throw redirect({ to: '/onboarding' })
    }
  },
  component: CreditCardRoute,
})

function CreditCardRoute() {
  const { accountId } = Route.useParams()
  return <CreditCardPage accountId={accountId} />
}
