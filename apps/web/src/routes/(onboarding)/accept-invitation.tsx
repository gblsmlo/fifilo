import { AcceptInvitationPage } from '@features/organizations'
import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'

const searchSchema = z.object({ invitationId: z.string().min(1).optional() })

export const Route = createFileRoute('/(onboarding)/accept-invitation')({
  validateSearch: searchSchema,
  component: AcceptInvitationRoute,
})

function AcceptInvitationRoute() {
  const { invitationId } = Route.useSearch()
  if (!invitationId) return <p className='text-destructive'>Convite inválido.</p>
  return <AcceptInvitationPage invitationId={invitationId} />
}
