import { authClient } from '@fifilo/auth/client'
import type { PublicOrganization } from '@fifilo/core/contracts/users'
import { Badge } from '@fifilo/ui/components/badge'
import { Button } from '@fifilo/ui/components/button'
import { Card, CardContent, CardHeader, CardTitle } from '@fifilo/ui/components/card'
import { Field, FieldDescription, FieldError, FieldLabel } from '@fifilo/ui/components/field'
import { Input } from '@fifilo/ui/components/input'
import { useRouter } from '@tanstack/react-router'
import { type FormEvent, useEffect, useState } from 'react'

interface OrganizationPageProps {
  organization: PublicOrganization
  role: string
}

export function OrganizationPage({ organization, role }: Readonly<OrganizationPageProps>) {
  const router = useRouter()
  const [organizations, setOrganizations] = useState<PublicOrganization[]>([])
  const [isPending, setIsPending] = useState(true)
  const [email, setEmail] = useState('')
  const [feedback, setFeedback] = useState<string>()
  const canInvite = role === 'owner' || role === 'admin'

  useEffect(() => {
    authClient.organization.list().then((result) => {
      if (result.data) setOrganizations(result.data)
      setIsPending(false)
    })
  }, [])

  const switchOrganization = async (organizationId: string) => {
    await authClient.organization.setActive({ organizationId })
    await router.invalidate()
    await router.navigate({ to: '/organization' })
  }

  const invite = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setFeedback(undefined)
    const result = await authClient.organization.inviteMember({
      email: email.trim(),
      role: 'member',
    })

    if (result.error) {
      setFeedback(result.error.message ?? 'Não foi possível enviar o convite.')
      return
    }

    setEmail('')
    setFeedback('Convite registrado para envio.')
  }

  return (
    <section className='mx-auto flex w-full max-w-3xl flex-col gap-6 p-6'>
      <div className='space-y-2'>
        <Badge variant='secondary'>{role}</Badge>
        <h1 className='font-semibold text-3xl tracking-tight'>{organization.name}</h1>
        <p className='text-muted-foreground'>Tenant ativo: {organization.slug}</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Alternar organização</CardTitle>
        </CardHeader>
        <CardContent>
          <Field name='active-organization'>
            <FieldLabel>Workspace ativo</FieldLabel>
            <select
              className='h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50'
              disabled={isPending}
              onChange={(event) => switchOrganization(event.target.value)}
              value={organization.id}
            >
              {(organizations.length > 0 ? organizations : [organization]).map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </Field>
        </CardContent>
      </Card>

      {canInvite ? (
        <Card>
          <CardHeader>
            <CardTitle>Convidar membro</CardTitle>
          </CardHeader>
          <CardContent>
            <form className='flex flex-col gap-4 sm:flex-row sm:items-end' onSubmit={invite}>
              <Field className='flex-1' name='member-email'>
                <FieldLabel>Email</FieldLabel>
                <Input
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder='pessoa@empresa.com'
                  required
                  type='email'
                  value={email}
                />
                <FieldDescription>O novo membro entra com o papel member.</FieldDescription>
                <FieldError>{feedback}</FieldError>
              </Field>
              <Button type='submit'>Enviar convite</Button>
            </form>
          </CardContent>
        </Card>
      ) : null}
    </section>
  )
}
