import { authClient } from '@fifilo/auth/client'
import { Button } from '@fifilo/ui/components/button'
import { Card, CardContent, CardHeader, CardTitle } from '@fifilo/ui/components/card'
import { Text } from '@fifilo/ui/components/text'
import { useRouter } from '@tanstack/react-router'
import { useState } from 'react'

export function AcceptInvitationPage({ invitationId }: Readonly<{ invitationId: string }>) {
  const router = useRouter()
  const [error, setError] = useState<string>()
  const [isSubmitting, setIsSubmitting] = useState(false)

  const accept = async () => {
    setError(undefined)
    setIsSubmitting(true)
    const result = await authClient.organization.acceptInvitation({ invitationId })

    if (result.error) {
      setError(result.error.message ?? 'Não foi possível aceitar o convite.')
      setIsSubmitting(false)
      return
    }

    await authClient.organization.setActive({
      organizationId: result.data.invitation.organizationId,
    })
    await router.invalidate()
    await router.navigate({ to: '/dashboard' })
  }

  return (
    <section className='mx-auto flex min-h-full w-full max-w-xl items-center p-6'>
      <Card className='w-full'>
        <CardHeader>
          <CardTitle>Convite para organização</CardTitle>
        </CardHeader>
        <CardContent className='space-y-4'>
          <Text foreground='muted' render={<p />} size='sm'>
            Confirme para associar sua conta à organização que enviou o convite.
          </Text>
          {error ? (
            <Text foreground='destructive' render={<p role='alert' />} size='sm'>
              {error}
            </Text>
          ) : null}
          <Button loading={isSubmitting} onClick={accept}>
            Aceitar convite
          </Button>
        </CardContent>
      </Card>
    </section>
  )
}
