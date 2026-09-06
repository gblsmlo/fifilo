import { type Result, ok } from '../../result'
import { type DateRangeError, validateDateRange } from '../date-range'
import type { AnalyticsReader, DateRangeQuery, TopExpenseRow } from '../ports'

export type TopExpensesQuery = DateRangeQuery & { limit: number }

/** The N largest expenses in the period, largest first (Fase 05 § Modelagem). */
export const getTopExpenses = async (
  query: TopExpensesQuery,
  reader: AnalyticsReader,
): Promise<Result<TopExpenseRow[], DateRangeError>> => {
  const range = validateDateRange(query.from, query.to)
  if (!range.ok) return range

  const rows = await reader.topExpenses(query)
  return ok(rows)
}
