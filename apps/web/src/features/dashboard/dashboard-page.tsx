import type { PublicOrganization, PublicUser } from '@twincam/core/contracts/users'
import { Badge } from '@twincam/ui/components/badge'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@twincam/ui/components/card'

interface DashboardPageProps {
  organization: PublicOrganization
  role: string
  user: PublicUser
}

export function DashboardPage({ organization, role, user }: Readonly<DashboardPageProps>) {
  return (
    <section className='mx-auto flex w-full max-w-5xl flex-col gap-6 p-6'>
      <div className='space-y-2'>
        <Badge variant='secondary'>{role}</Badge>
        <h1 className='font-semibold text-3xl tracking-tight'>Olá, {user.name.split(' ')[0]}</h1>
        <p className='text-muted-foreground'>
          Este é o ponto de partida de {organization.name}. Adicione aqui o primeiro contexto de
          negócio do seu SaaS.
        </p>
      </div>

      <div className='grid gap-4 md:grid-cols-3'>
        <FoundationCard
          description='Sessão, recuperação de senha e autenticação em dois fatores.'
          title='Auth pronta'
        />
        <FoundationCard
          description='Tenant ativo, membros, convites e papéis por organização.'
          title='Organizações'
        />
        <FoundationCard
          description='Core independente, adapters HTTP e persistência isolada.'
          title='Monorepo modular'
        />
      </div>
    </section>
  )
}

function FoundationCard({ description, title }: Readonly<{ description: string; title: string }>) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <CardDescription>{description}</CardDescription>
      </CardContent>
    </Card>
  )
}
