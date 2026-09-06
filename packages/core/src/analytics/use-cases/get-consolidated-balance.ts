import { type Result, ok } from '../../result'
import type { AnalyticsReader } from '../ports'

export type ConsolidatedBalanceQuery = {
  asOf: string
  organizationId: string
}

export type ConsolidatedBalanceResult = {
  availableCashMinor: number
  committedInvoiceMinor: number
  netMinor: number
}

/**
 * "Disponível em caixa, comprometido em fatura, líquido" (Fase 05 §
 * Modelagem) - the same distinction Fase 03 § Riscos exists to protect: a
 * card purchase never reduces cash, so this reads the two as genuinely
 * separate sums and only nets them here, at the very end, for display.
 */
export const getConsolidatedBalance = async (
  query: ConsolidatedBalanceQuery,
  reader: AnalyticsReader,
): Promise<Result<ConsolidatedBalanceResult, never>> => {
  const { availableCashMinor, committedInvoiceMinor } = await reader.consolidatedBalance(
    query.organizationId,
    query.asOf,
  )

  return ok({
    availableCashMinor,
    committedInvoiceMinor,
    netMinor: availableCashMinor - committedInvoiceMinor,
  })
}
