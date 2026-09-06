import { type Result, ok } from '../../result'
import { type DateRangeError, validateDateRange } from '../date-range'
import type { AnalyticsReader, DateRangeQuery, MonthlyCashflowPoint } from '../ports'

export type MonthlyCashflowQuery = DateRangeQuery

/**
 * Income, expense and the net per month (Fase 05 § Modelagem). A transfer
 * never reaches either side - the reader's own query excludes `kind =
 * 'transfer'` at the source, the same way a category report already
 * excludes it by a `null` category (Decision 023).
 */
export const getMonthlyCashflow = async (
  query: MonthlyCashflowQuery,
  reader: AnalyticsReader,
): Promise<Result<MonthlyCashflowPoint[], DateRangeError>> => {
  const range = validateDateRange(query.from, query.to)
  if (!range.ok) return range

  const points = await reader.monthlyCashflow(query)
  return ok(points)
}
