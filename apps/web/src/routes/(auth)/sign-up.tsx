import { SignUpPage } from '@features/auth'
import { decodeAuthRedirect } from '@features/auth/utils/redirect'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/(auth)/sign-up')({
  component: SignUpRoute,
  validateSearch: (
    search: Record<string, unknown>,
  ): {
    redirect?: string
  } => ({
    redirect: typeof search.redirect === 'string' ? search.redirect : undefined,
  }),
})

function SignUpRoute() {
  const { redirect } = Route.useSearch()
  const redirectTo = decodeAuthRedirect(redirect)

  return <SignUpPage redirectTo={redirectTo} />
}
