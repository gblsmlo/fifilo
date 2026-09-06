import type { EntityId } from '../../primitives'
import { type Result, ok } from '../../result'
import { type DateRangeError, validateDateRange } from '../date-range'
import type { AccountBalanceSeries, AnalyticsReader, BalancePoint, DateRangeQuery } from '../ports'

export type BalanceEvolutionQuery = DateRangeQuery & { accountId?: EntityId }

export type BalanceEvolutionResult = {
  accounts: AccountBalanceSeries[]
  consolidated: BalancePoint[]
}

/**
 * The accumulated balance per day, per account and consolidated (Fase 05 §
 * Modelagem). The running sum is `sum(...) over (order by occurred_on)` in
 * the reader's own query - a window function, not a loop.
 */
export const getBalanceEvolution = async (
  query: BalanceEvolutionQuery,
  reader: AnalyticsReader,
): Promise<Result<BalanceEvolutionResult, DateRangeError>> => {
  const range = validateDateRange(query.from, query.to)
  if (!range.ok) return range

  const result = await reader.balanceEvolution(query)
  return ok(result)
}
