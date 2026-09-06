import type { EntityId } from '../primitives'

/**
 * A lateral table, not columns on `financial_accounts` (Fase 03 §
 * Persistência): a credit card's lifecycle is distinct from a plain
 * account's, and nullable columns on every other account kind would make
 * the main table dishonest about what it holds.
 */
export type CreditCardDetails = {
  accountId: EntityId
  closingDay: number
  createdAt: Date
  dueDay: number
  limitMinor: number
  organizationId: string
  updatedAt: Date
  version: number
}

/**
 * `limite − (saldo devedor de faturas não pagas) − (lançamentos da fatura
 * aberta)` (Fase 03 § Modelagem) - the one formula the domain and every
 * caller agree on, so "available limit" never means two different numbers
 * in the same product.
 */
export const computeAvailableLimit = (
  limitMinor: number,
  unpaidClosedTotalMinor: number,
  openInvoiceTotalMinor: number,
): number => limitMinor - unpaidClosedTotalMinor - openInvoiceTotalMinor
