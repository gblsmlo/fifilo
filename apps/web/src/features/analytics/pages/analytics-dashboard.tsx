import { resolveThisMonthRange } from '@features/transactions'

import { BalanceEvolutionSection } from '../components/balance-evolution-section'
import { ConsolidatedBalanceSection } from '../components/consolidated-balance-section'
import { MonthlyCashflowSection } from '../components/monthly-cashflow-section'
import { PeriodPicker } from '../components/period-picker'
import { SpendByAccountSection } from '../components/spend-by-account-section'
import { SpendByCategorySection } from '../components/spend-by-category-section'
import { TopExpensesSection } from '../components/top-expenses-section'
import type { AnalyticsSearch } from '../route-search'

interface AnalyticsDashboardProps {
  onSearchChange: (next: AnalyticsSearch) => void
  search: AnalyticsSearch
}

/**
 * The period-aware dashboard Fase 05 § Objetivo asks for: every section
 * fetches its own projection through `@fifilo/core/analytics`'s six use
 * cases (Decision 028), and this component only assembles already-projected
 * data into the neutral chart compositions from `packages/patterns`
 * (Decision 027) - it never queries `entries` or `transactions` itself.
 */
export function AnalyticsDashboard({ onSearchChange, search }: Readonly<AnalyticsDashboardProps>) {
  const thisMonth = resolveThisMonthRange()
  const from = search.from ?? thisMonth.from
  const to = search.to ?? thisMonth.to

  return (
    <div className='flex flex-col gap-6'>
      <PeriodPicker
        from={from}
        onChange={(next) => onSearchChange({ ...search, ...next })}
        to={to}
      />

      <ConsolidatedBalanceSection asOf={to} />

      <div className='grid gap-4 lg:grid-cols-2'>
        <MonthlyCashflowSection from={from} to={to} />
        <BalanceEvolutionSection from={from} to={to} />
      </div>

      <div className='grid gap-4 lg:grid-cols-2'>
        <SpendByCategorySection from={from} to={to} />
        <SpendByAccountSection from={from} to={to} />
      </div>

      <TopExpensesSection from={from} to={to} />
    </div>
  )
}
