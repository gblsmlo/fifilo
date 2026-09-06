import type { EntityId } from '../primitives'

/**
 * `open -> closed -> paid` or `open -> closed -> overdue -> paid` (Fase 03 §
 * Modelagem). `overdue` is a read-time derivation of `closed` past `dueOn`,
 * never a value written independently - nothing schedules the transition.
 */
export type InvoiceStatus = 'closed' | 'open' | 'overdue' | 'paid'

export type CardInvoice = {
  accountId: EntityId
  closedAt: Date | null
  dueOn: string
  id: EntityId
  organizationId: string
  paidAt: Date | null
  periodEnd: string
  periodStart: string
  status: InvoiceStatus
  totalMinor: number
  version: number
}

export const canClose = (invoice: Pick<CardInvoice, 'status'>): boolean => invoice.status === 'open'

export const canPay = (invoice: Pick<CardInvoice, 'status'>): boolean =>
  invoice.status === 'closed' || invoice.status === 'overdue'

/**
 * `status` only ever holds what a write produced; whether a closed invoice
 * reads as overdue depends on the clock, so it is computed here, not stored
 * (Decision 018's spirit applied to invoices: the fact is `closed`, the
 * label is a function of "now").
 */
export const effectiveStatus = (
  invoice: Pick<CardInvoice, 'dueOn' | 'status'>,
  today: string,
): InvoiceStatus =>
  invoice.status === 'closed' && today > invoice.dueOn ? 'overdue' : invoice.status
