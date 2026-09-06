import type { AnalyticsSearch } from '@features/analytics'
import { AnalyticsDashboard } from '@features/analytics'
import type { PublicOrganization, PublicUser } from '@fifilo/core/contracts/users'
import { Badge } from '@fifilo/ui/components/badge'

interface DashboardPageProps {
  onSearchChange: (next: AnalyticsSearch) => void
  organization: PublicOrganization
  role: string
  search: AnalyticsSearch
  user: PublicUser
}

export function DashboardPage({
  onSearchChange,
  organization,
  role,
  search,
  user,
}: Readonly<DashboardPageProps>) {
  return (
    <section className='mx-auto flex w-full max-w-5xl flex-col gap-6 p-6'>
      <div className='space-y-2'>
        <Badge variant='secondary'>{role}</Badge>
        <h1 className='font-semibold text-3xl tracking-tight'>Olá, {user.name.split(' ')[0]}</h1>
        <p className='text-muted-foreground'>
          O painel de {organization.name} no período selecionado.
        </p>
      </div>

      <AnalyticsDashboard onSearchChange={onSearchChange} search={search} />
    </section>
  )
}
