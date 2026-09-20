import { authClient } from '@fifilo/auth/client'
import type { PublicOrganization } from '@fifilo/core/contracts/users'
import { DataTable, type DataTableColumn } from '@fifilo/patterns/data-table'
import { Widget, WidgetPanel } from '@fifilo/patterns/widget'
import { Badge } from '@fifilo/ui/components/badge'
import { Button } from '@fifilo/ui/components/button'
import { Field, FieldDescription, FieldError, FieldLabel } from '@fifilo/ui/components/field'
import { Form } from '@fifilo/ui/components/form'
import { Input } from '@fifilo/ui/components/input'
import {
  Select,
  SelectItem,
  SelectPopup,
  SelectTrigger,
  SelectValue,
} from '@fifilo/ui/components/select'
import { Text } from '@fifilo/ui/components/text'
import { useRouter } from '@tanstack/react-router'
import { Page } from '@web/components/page'
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

  const availableOrganizations = organizations.length > 0 ? organizations : [organization]

  const memberColumns: DataTableColumn<Member>[] = [
    {
      cell: (member) => (
        <div className='flex flex-col gap-0.5'>
          <Text render={<span />} size='sm' weight='medium'>
            {member.user.name}
          </Text>
          <Text foreground='muted' render={<span />} size='xs'>
            {member.user.email}
          </Text>
        </div>
      ),
      header: 'Membro',
      id: 'member',
    },
    {
      cell: (member) =>
        member.role === 'owner' ? (
          <Badge variant='secondary'>{ROLE_LABELS.owner}</Badge>
        ) : (
          <Select
            disabled={!canManageMembers}
            onValueChange={(value) => {
              if (value) void changeRole(member.id, value as InvitableRole)
            }}
            value={member.role}
          >
            <SelectTrigger
              aria-label={`Papel de ${member.user.name}`}
              className='min-w-44'
              title={canManageMembers ? undefined : 'Somente owner e admin trocam papéis.'}
            >
              <SelectValue>{(value) => ROLE_LABELS[String(value)] ?? value}</SelectValue>
            </SelectTrigger>
            <SelectPopup>
              {INVITABLE_ROLES.map((option) => (
                <SelectItem key={option} value={option}>
                  {ROLE_LABELS[option]}
                </SelectItem>
              ))}
            </SelectPopup>
          </Select>
        ),
      header: 'Papel',
      id: 'role',
    },
    {
      align: 'end',
      cell: (member) =>
        member.role === 'owner' ? null : (
          <Button
            disabled={!canManageMembers}
            onClick={() => removeMember(member.id)}
            size='sm'
            title={canManageMembers ? undefined : 'Somente owner e admin removem membros.'}
            type='button'
            variant='ghost'
          >
            Remover
          </Button>
        ),
      header: <span className='sr-only'>Ações</span>,
      id: 'actions',
    },
  ]

  return (
    <Page width='md'>
      <Page.Header
        align='start'
        description={`Tenant ativo: ${organization.slug}`}
        meta={<Badge variant='secondary'>{ROLE_LABELS[role] ?? role}</Badge>}
        title={organization.name}
      />

      <Widget title='Alternar organização'>
        <WidgetPanel>
          <Field name='active-organization'>
            <FieldLabel>Workspace ativo</FieldLabel>
            <Select
              disabled={isPending}
              onValueChange={(value) => {
                if (value) void switchOrganization(value)
              }}
              value={organization.id}
            >
              <SelectTrigger aria-label='Workspace ativo'>
                <SelectValue>
                  {(value) =>
                    availableOrganizations.find((item) => item.id === value)?.name ?? value
                  }
                </SelectValue>
              </SelectTrigger>
              <SelectPopup>
                {availableOrganizations.map((item) => (
                  <SelectItem key={item.id} value={item.id}>
                    {item.name}
                  </SelectItem>
                ))}
              </SelectPopup>
            </Select>
          </Field>
        </WidgetPanel>
      </Widget>

      {canViewMembers ? (
        <Widget
          description='Quem acessa este workspace e com qual papel.'
          footer={
            memberFeedback ? (
              <Text foreground='destructive' render={<p role='alert' />} size='sm'>
                {memberFeedback}
              </Text>
            ) : undefined
          }
          state={members.length === 0 ? 'empty' : 'data'}
          surface={{
            description: 'Os membros aparecem aqui assim que a lista carregar.',
            title: 'Nenhum membro carregado ainda',
          }}
          title='Membros'
        >
          <DataTable
            caption='Membros da organização'
            columns={memberColumns}
            rowKey={(member) => member.id}
            rows={members}
          />
        </Widget>
      ) : null}

      {canManageMembers ? (
        <Widget title='Convidar membro'>
          <WidgetPanel>
            <Form className='flex flex-col gap-4 sm:flex-row sm:items-end' onSubmit={invite}>
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
                <Select
                  onValueChange={(value) => {
                    if (value) setInviteRole(value as InvitableRole)
                  }}
                  value={inviteRole}
                >
                  <SelectTrigger aria-label='Papel'>
                    <SelectValue>{(value) => ROLE_LABELS[String(value)] ?? value}</SelectValue>
                  </SelectTrigger>
                  <SelectPopup>
                    {INVITABLE_ROLES.map((option) => (
                      <SelectItem key={option} value={option}>
                        {ROLE_LABELS[option]}
                      </SelectItem>
                    ))}
                  </SelectPopup>
                </Select>
                <FieldDescription>
                  Somente leitura não pode criar nem editar dados.
                </FieldDescription>
              </Field>
              <Button type='submit'>Enviar convite</Button>
            </Form>
          </WidgetPanel>
        </Widget>
      ) : null}
    </Page>
  )
}
