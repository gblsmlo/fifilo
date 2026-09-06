import type { EntityId } from '../../primitives'
import type { CardInvoice } from '../invoice'
import { effectiveStatus } from '../invoice'
import type { InvoiceRepository } from '../ports'

export type ListInvoicesQuery = {
  accountId: EntityId
  organizationId: string
  today: string
}

/** Reports `overdue` at read time (`effectiveStatus`), never stored (`invoice.ts`). */
export const listInvoices = async (
  query: ListInvoicesQuery,
  invoices: InvoiceRepository,
): Promise<CardInvoice[]> => {
  const rows = await invoices.list(query.organizationId, query.accountId)
  return rows
    .map((invoice) => ({ ...invoice, status: effectiveStatus(invoice, query.today) }))
    .sort((a, b) => (a.periodStart < b.periodStart ? 1 : -1))
}
