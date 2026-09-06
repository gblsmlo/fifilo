import { ResetPasswordPage } from '@features/auth'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/(auth)/reset-password')({
  component: ResetPasswordRoute,
  validateSearch: (
    search: Record<string, unknown>,
  ): {
    token?: string
  } => ({
    token: typeof search.token === 'string' ? search.token : undefined,
  }),
})

function ResetPasswordRoute() {
  const { token } = Route.useSearch()

  return <ResetPasswordPage token={token} />
}
