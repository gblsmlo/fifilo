import { type DomainError, notFoundError } from '../../errors'
import type { EntityId } from '../../primitives'
import { type Result, err, ok } from '../../result'
import { type CardInvoice, effectiveStatus } from '../invoice'
import type { InvoiceItem, InvoiceItemReader, InvoiceRepository } from '../ports'

export type GetInvoiceQuery = {
  id: EntityId
  organizationId: string
  today: string
}

export type GetInvoiceError = DomainError<'not_found', 'invoice_not_found'>

export type InvoiceWithItems = {
  invoice: CardInvoice
  items: InvoiceItem[]
}

export const getInvoice = async (
  query: GetInvoiceQuery,
  invoices: InvoiceRepository,
  items: InvoiceItemReader,
): Promise<Result<InvoiceWithItems, GetInvoiceError>> => {
  const invoice = await invoices.findById(query.organizationId, query.id)
  if (!invoice) return err(notFoundError('invoice_not_found', 'Invoice not found.'))

  const lines = await items.listByInvoice(query.organizationId, query.id)

  return ok({
    invoice: { ...invoice, status: effectiveStatus(invoice, query.today) },
    items: lines,
  })
}
