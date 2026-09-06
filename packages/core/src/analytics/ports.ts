import type { AccountKind } from '../accounts'
import type { EntityId } from '../primitives'

export type DateRangeQuery = {
  from: string
  organizationId: string
  to: string
}

export type MonthlyCashflowPoint = {
  expenseMinor: number
  incomeMinor: number
  month: string
}

export type CategorySpendRow = {
  categoryId: EntityId
  categoryName: string
  parentId: EntityId | null
  totalMinor: number
}

export type BalancePoint = {
  balanceMinor: number
  date: string
}

export type AccountBalanceSeries = {
  accountId: EntityId
  points: BalancePoint[]
}

export type TopExpenseRow = {
  amountMinor: number
  categoryName: string | null
  description: string
  occurredOn: string
  transactionId: EntityId
}

export type AccountSpendRow = {
  accountId: EntityId
  accountName: string
  kind: AccountKind
  totalMinor: number
}

/**
 * The read-only aggregation surface every projection composes with
 * (Decision 003: the persistence a use case needs, not the shape of any
 * table). Every method sums inside PostgreSQL - a window function or a CTE
 * (Fase 05 § Persistência) - never rows brought into the application to be
 * reduced in JavaScript (Fase 05 § Riscos).
 */
export type AnalyticsReader = {
  balanceEvolution: (
    query: DateRangeQuery & { accountId?: EntityId },
  ) => Promise<{ accounts: AccountBalanceSeries[]; consolidated: BalancePoint[] }>
  consolidatedBalance: (
    organizationId: string,
    asOf: string,
  ) => Promise<{ availableCashMinor: number; committedInvoiceMinor: number }>
  monthlyCashflow: (query: DateRangeQuery) => Promise<MonthlyCashflowPoint[]>
  spendByAccount: (query: DateRangeQuery) => Promise<AccountSpendRow[]>
  spendByCategory: (
    query: DateRangeQuery & { kind: 'expense' | 'income' },
  ) => Promise<CategorySpendRow[]>
  topExpenses: (query: DateRangeQuery & { limit: number }) => Promise<TopExpenseRow[]>
}
