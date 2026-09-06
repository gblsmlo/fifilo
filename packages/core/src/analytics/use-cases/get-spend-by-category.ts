import { type Result, ok } from '../../result'
import { type DateRangeError, validateDateRange } from '../date-range'
import type { AnalyticsReader, CategorySpendRow, DateRangeQuery } from '../ports'

export type SpendByCategoryQuery = DateRangeQuery & { kind: 'expense' | 'income' }

export type CategorySpendShare = CategorySpendRow & { percentage: number }

/**
 * Percentage of the period's total, one category and subcategory per row
 * (Fase 05 § Modelagem). The division is over an already-aggregated,
 * small result set - not the "sum in JavaScript" antipattern Fase 05 §
 * Riscos names, which is about rows, not the categories a workspace has.
 */
export const getSpendByCategory = async (
  query: SpendByCategoryQuery,
  reader: AnalyticsReader,
): Promise<Result<CategorySpendShare[], DateRangeError>> => {
  const range = validateDateRange(query.from, query.to)
  if (!range.ok) return range

  const rows = await reader.spendByCategory(query)
  const total = rows.reduce((sum, row) => sum + row.totalMinor, 0)

  return ok(
    rows.map((row) => ({
      ...row,
      percentage: total === 0 ? 0 : (row.totalMinor / total) * 100,
    })),
  )
}
