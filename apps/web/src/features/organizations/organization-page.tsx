import { authClient } from '@fifilo/auth/client'
import type { PublicOrganization } from '@fifilo/core/contracts/users'
import { Badge } from '@fifilo/ui/components/badge'
import { Button } from '@fifilo/ui/components/button'
import { Card, CardContent, CardHeader, CardTitle } from '@fifilo/ui/components/card'
import {
  Field,
  FieldControl,
  FieldDescription,
  FieldError,
  FieldLabel,
} from '@fifilo/ui/components/field'
import { Input } from '@fifilo/ui/components/input'
import { useRouter } from '@tanstack/react-router'
import { type FormEvent, useEffect, useState } from 'react'

interface OrganizationPageProps {
  organization: PublicOrganization
  role: string
}

const INVITABLE_ROLES = ['member', 'admin', 'viewer'] as const
type InvitableRole = (typeof INVITABLE_ROLES)[number]

const ROLE_LABELS: Record<string, string> = {
  admin: 'Administrador',
  member: 'Membro',
  owner: 'Dono',
  viewer: 'Somente leitura',
}

const selectClassName =
  'h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50'

interface Member {
  id: string
  role: string
  user: { email: string; name: string }
}

export function OrganizationPage({ organization, role }: Readonly<OrganizationPageProps>) {
  const router = useRouter()
  const [organizations, setOrganizations] = useState<PublicOrganization[]>([])
  const [isPending, setIsPending] = useState(true)
  const [members, setMembers] = useState<Member[]>([])
  const [email, setEmail] = useState('')
  const [inviteRole, setInviteRole] = useState<InvitableRole>('member')
  const [feedback, setFeedback] = useState<string>()
  const [memberFeedback, setMemberFeedback] = useState<string>()
  const canManageMembers = role === 'owner' || role === 'admin'
  const canViewMembers = role !== 'viewer'

  const loadMembers = () => {
    authClient.organization.listMembers().then((result) => {
      if (result.data) setMembers(result.data.members)
    })
  }

  useEffect(() => {
    authClient.organization.list().then((result) => {
      if (result.data) setOrganizations(result.data)
      setIsPending(false)
    })
    if (canViewMembers) loadMembers()
  }, [organization.id, canViewMembers])

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
      role: inviteRole,
    })

    if (result.error) {
      setFeedback(result.error.message ?? 'Não foi possível enviar o convite.')
      return
    }

    setEmail('')
    setFeedback('Convite registrado para envio.')
  }

  const changeRole = async (memberId: string, nextRole: InvitableRole) => {
    setMemberFeedback(undefined)
    const result = await authClient.organization.updateMemberRole({ memberId, role: nextRole })
    if (result.error) {
      setMemberFeedback(result.error.message ?? 'Não foi possível trocar o papel.')
      return
    }
    loadMembers()
  }

  const removeMember = async (memberId: string) => {
    setMemberFeedback(undefined)
    const result = await authClient.organization.removeMember({ memberIdOrEmail: memberId })
    if (result.error) {
      setMemberFeedback(result.error.message ?? 'Não foi possível remover o membro.')
      return
    }
    loadMembers()
  }

  return (
    <section className='mx-auto flex w-full max-w-3xl flex-col gap-6 p-6'>
      <div className='space-y-2'>
        <Badge variant='secondary'>{ROLE_LABELS[role] ?? role}</Badge>
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
            <FieldControl
              render={
                <select
                  className={selectClassName}
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
              }
            />
          </Field>
        </CardContent>
      </Card>

      {canViewMembers ? (
        <Card>
          <CardHeader>
            <CardTitle>Membros</CardTitle>
          </CardHeader>
          <CardContent className='flex flex-col gap-3'>
            {members.length === 0 ? (
              <p className='text-muted-foreground text-sm'>Nenhum membro carregado ainda.</p>
            ) : (
              members.map((member) => (
                <div className='flex items-center justify-between gap-4' key={member.id}>
                  <div>
                    <p className='font-medium text-sm'>{member.user.name}</p>
                    <p className='text-muted-foreground text-sm'>{member.user.email}</p>
                  </div>
                  {member.role === 'owner' ? (
                    <Badge variant='secondary'>{ROLE_LABELS.owner}</Badge>
                  ) : (
                    <div className='flex items-center gap-2'>
                      <select
                        aria-label={`Papel de ${member.user.name}`}
                        className={selectClassName}
                        disabled={!canManageMembers}
                        onChange={(event) =>
                          changeRole(member.id, event.target.value as InvitableRole)
                        }
                        title={
                          canManageMembers ? undefined : 'Somente owner e admin trocam papéis.'
                        }
                        value={member.role}
                      >
                        {INVITABLE_ROLES.map((option) => (
                          <option key={option} value={option}>
                            {ROLE_LABELS[option]}
                          </option>
                        ))}
                      </select>
                      <Button
                        disabled={!canManageMembers}
                        onClick={() => removeMember(member.id)}
                        title={
                          canManageMembers ? undefined : 'Somente owner e admin removem membros.'
                        }
                        type='button'
                        variant='ghost'
                      >
                        Remover
                      </Button>
                    </div>
                  )}
                </div>
              ))
            )}
            {memberFeedback ? (
              <p className='text-destructive-foreground text-sm'>{memberFeedback}</p>
            ) : null}
          </CardContent>
        </Card>
      ) : null}

      {canManageMembers ? (
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
                <FieldError>{feedback}</FieldError>
              </Field>
              <Field name='member-role'>
                <FieldLabel>Papel</FieldLabel>
                <FieldControl
                  render={
                    <select
                      className={selectClassName}
                      onChange={(event) => setInviteRole(event.target.value as InvitableRole)}
                      value={inviteRole}
                    >
                      {INVITABLE_ROLES.map((option) => (
                        <option key={option} value={option}>
                          {ROLE_LABELS[option]}
                        </option>
                      ))}
                    </select>
                  }
                />
                <FieldDescription>
                  Somente leitura não pode criar nem editar dados.
                </FieldDescription>
              </Field>
              <Button type='submit'>Enviar convite</Button>
            </form>
          </CardContent>
        </Card>
      ) : null}
    </section>
  )
}
