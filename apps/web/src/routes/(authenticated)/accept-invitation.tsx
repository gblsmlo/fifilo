import { AcceptInvitationPage } from '@features/organizations'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/(authenticated)/accept-invitation')({
  component: AcceptInvitationRoute,
  validateSearch: (
    search: Record<string, unknown>,
  ): {
    invitationId?: string
  } => ({
    invitationId: typeof search.invitationId === 'string' ? search.invitationId : undefined,
  }),
})

function AcceptInvitationRoute() {
  const { invitationId } = Route.useSearch()

  if (!invitationId) {
    return (
      <p className='mx-auto max-w-xl p-6 text-muted-foreground text-sm'>
        O convite não possui um identificador válido.
      </p>
    )
  }

  return <AcceptInvitationPage invitationId={invitationId} />
}
