import { type Result, ok } from '../../result'
import { type DateRangeError, validateDateRange } from '../date-range'
import type { AccountSpendRow, AnalyticsReader, DateRangeQuery } from '../ports'

export type SpendByAccountQuery = DateRangeQuery

/** Spend per account, cash and card together - `kind` on each row is what tells them apart (Fase 05 § Modelagem). */
export const getSpendByAccount = async (
  query: SpendByAccountQuery,
  reader: AnalyticsReader,
): Promise<Result<AccountSpendRow[], DateRangeError>> => {
  const range = validateDateRange(query.from, query.to)
  if (!range.ok) return range

  const rows = await reader.spendByAccount(query)
  return ok(rows)
}
