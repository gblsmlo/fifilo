import { type DomainError, conflictError, notFoundError } from '../../errors'
import type { EntityId } from '../../primitives'
import { type Result, err, ok } from '../../result'
import { type CardInvoice, canClose } from '../invoice'
import type { InvoiceRepository } from '../ports'

export type CloseInvoiceCommand = {
  expectedVersion: number
  id: EntityId
  organizationId: string
}

export type CloseInvoiceError = DomainError<
  'conflict' | 'not_found',
  'invoice_already_paid' | 'invoice_not_found' | 'version_conflict'
>

/**
 * Closing freezes the entry set and computes the total (Fase 03 §
 * Modelagem). Closing an already-closed invoice is a no-op that returns it
 * as-is - the route is declared idempotent (Fase 03 § API) and a retry must
 * not recompute a total that changed underneath it.
 */
export const closeInvoice = async (
  command: CloseInvoiceCommand,
  invoices: InvoiceRepository,
): Promise<Result<CardInvoice, CloseInvoiceError>> => {
  const invoice = await invoices.findById(command.organizationId, command.id)
  if (!invoice) return err(notFoundError('invoice_not_found', 'Invoice not found.'))

  if (invoice.status === 'paid') {
    return err(conflictError('invoice_already_paid', 'A paid invoice cannot be closed again.'))
  }

  if (!canClose(invoice)) return ok(invoice)

  const totalMinor = await invoices.sumEntries(command.organizationId, command.id)
  const outcome = await invoices.close(
    command.organizationId,
    command.id,
    command.expectedVersion,
    totalMinor,
  )

  if (outcome === 'not_found') return err(notFoundError('invoice_not_found', 'Invoice not found.'))
  if (outcome === 'not_open') return ok(invoice)
  if (outcome === 'version_conflict') {
    return err(conflictError('version_conflict', 'This invoice changed since you last saw it.'))
  }

  return ok(outcome)
}
