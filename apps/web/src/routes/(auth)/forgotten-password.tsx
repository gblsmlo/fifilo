import { ForgottenPasswordPage } from '@features/auth'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/(auth)/forgotten-password')({
  component: ForgottenPasswordRoute,
  validateSearch: (
    search: Record<string, unknown>,
  ): {
    email?: string
  } => ({
    email: typeof search.email === 'string' ? search.email : undefined,
  }),
})

function ForgottenPasswordRoute() {
  const { email } = Route.useSearch()

  return <ForgottenPasswordPage initialEmail={email} />
}
