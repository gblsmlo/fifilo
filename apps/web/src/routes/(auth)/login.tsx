import { SignInPage } from '@features/auth'
import { decodeAuthRedirect } from '@features/auth/utils/redirect'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/(auth)/login')({
  component: LoginRoute,
  validateSearch: (
    search: Record<string, unknown>,
  ): {
    email?: string
    redirect?: string
  } => ({
    email: typeof search.email === 'string' ? search.email : undefined,
    redirect: typeof search.redirect === 'string' ? search.redirect : undefined,
  }),
})

function LoginRoute() {
  const { email, redirect } = Route.useSearch()
  const redirectTo = decodeAuthRedirect(redirect)

  return <SignInPage initialEmail={email} redirectTo={redirectTo} />
}
