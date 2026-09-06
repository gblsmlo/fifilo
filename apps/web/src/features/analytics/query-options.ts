import { queryOptions } from '@tanstack/react-query'

import { getBalanceEvolution } from './http/get-balance-evolution'
import { getConsolidatedBalance } from './http/get-consolidated-balance'
import { getMonthlyCashflow } from './http/get-monthly-cashflow'
import { getSpendByAccount } from './http/get-spend-by-account'
import { getSpendByCategory } from './http/get-spend-by-category'
import { getTopExpenses } from './http/get-top-expenses'

/**
 * One factory per projection, shared by the dashboard's `useQuery` calls
 * (Decision 007) - each carries the period in its own `queryKey` so changing
 * it never serves a stale cache entry for the previous one.
 */
export const monthlyCashflowQueryOptions = (period: { from: string; to: string }) =>
  queryOptions({
    queryFn: () => getMonthlyCashflow(period),
    queryKey: ['analytics', 'monthly-cashflow', period.from, period.to],
  })

export const spendByCategoryQueryOptions = (period: {
  from: string
  kind: 'expense' | 'income'
  to: string
}) =>
  queryOptions({
    queryFn: () => getSpendByCategory(period),
    queryKey: ['analytics', 'spend-by-category', period.from, period.to, period.kind],
  })

export const spendByAccountQueryOptions = (period: { from: string; to: string }) =>
  queryOptions({
    queryFn: () => getSpendByAccount(period),
    queryKey: ['analytics', 'spend-by-account', period.from, period.to],
  })

export const balanceEvolutionQueryOptions = (period: { from: string; to: string }) =>
  queryOptions({
    queryFn: () => getBalanceEvolution(period),
    queryKey: ['analytics', 'balance-evolution', period.from, period.to],
  })

export const consolidatedBalanceQueryOptions = (asOf: string) =>
  queryOptions({
    queryFn: () => getConsolidatedBalance({ asOf }),
    queryKey: ['analytics', 'consolidated-balance', asOf],
  })

export const topExpensesQueryOptions = (period: { from: string; limit?: number; to: string }) =>
  queryOptions({
    queryFn: () => getTopExpenses(period),
    queryKey: ['analytics', 'top-expenses', period.from, period.to, period.limit ?? 10],
  })
