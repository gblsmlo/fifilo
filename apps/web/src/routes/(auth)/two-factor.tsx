import { TwoFactorPage } from '@features/auth'
import { decodeAuthRedirect } from '@features/auth/utils/redirect'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/(auth)/two-factor')({
  component: TwoFactorRoute,
  validateSearch: (
    search: Record<string, unknown>,
  ): {
    redirect?: string
  } => ({
    redirect: typeof search.redirect === 'string' ? search.redirect : undefined,
  }),
})

function TwoFactorRoute() {
  const { redirect } = Route.useSearch()

  const redirectTo = decodeAuthRedirect(redirect)

  return <TwoFactorPage redirectTo={redirectTo} />
}
