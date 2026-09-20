import type { AnalyticsSearch } from '@features/analytics'
import { AnalyticsDashboard } from '@features/analytics'
import { SetupReminder } from '@features/onboarding'
import type { PublicOrganization, PublicUser } from '@fifilo/core/contracts/users'
import { Badge } from '@fifilo/ui/components/badge'
import { Page } from '@web/components/page'

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
    <Page width='lg'>
      <Page.Header
        align='start'
        description={`O painel de ${organization.name} no período selecionado.`}
        meta={<Badge variant='secondary'>{role}</Badge>}
        title={`Olá, ${user.name.split(' ')[0]}`}
      />

      <SetupReminder />

      <AnalyticsDashboard onSearchChange={onSearchChange} search={search} />
    </Page>
  )
}
