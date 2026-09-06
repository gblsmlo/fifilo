import { type DomainError, notFoundError, validationError } from '../../errors'
import type { CurrencyCode, EntityId } from '../../primitives'
import { type Money, money } from '../../primitives'
import { type Result, err, ok } from '../../result'
import { computeAvailableLimit } from '../credit-card'
import type { CreditCardRepository, InvoiceRepository } from '../ports'

export type GetAvailableLimitQuery = {
  accountId: EntityId
  currency: CurrencyCode
  organizationId: string
}

export type GetAvailableLimitError = DomainError<
  'not_found' | 'validation',
  'credit_card_not_configured' | 'limit_out_of_range'
>

/**
 * `limite − faturas fechadas não pagas − lançamentos da fatura aberta` (Fase
 * 03 § Modelagem) - the one formula every reader of "available limit" agrees
 * on. `findCurrentOpenByAccount` can be null right after the card is
 * attached, before any purchase opened a first invoice.
 */
export const getAvailableLimit = async (
  query: GetAvailableLimitQuery,
  cards: CreditCardRepository,
  invoices: InvoiceRepository,
): Promise<Result<Money, GetAvailableLimitError>> => {
  const card = await cards.findByAccountId(query.organizationId, query.accountId)
  if (!card) {
    return err(
      notFoundError('credit_card_not_configured', 'This account has no credit card details yet.'),
    )
  }

  const unpaidClosedTotalMinor = await invoices.sumUnpaidClosedTotals(
    query.organizationId,
    query.accountId,
  )
  const current = await invoices.findCurrentOpenByAccount(query.organizationId, query.accountId)
  const openInvoiceTotalMinor = current
    ? await invoices.sumEntries(query.organizationId, current.id)
    : 0

  const availableMinor = computeAvailableLimit(
    card.limitMinor,
    unpaidClosedTotalMinor,
    openInvoiceTotalMinor,
  )

  const available = money(availableMinor, query.currency)
  if (!available.ok) {
    return err(validationError('limit_out_of_range', 'The available limit overflowed its range.'))
  }

  return ok(available.value)
}
