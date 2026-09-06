import type {
  CardInvoice,
  CreditCardDetails,
  CreditCardResponse,
  InvoiceItem,
  InvoiceItemResponse,
  InvoiceResponse,
  InvoiceWithItemsResponse,
} from '@fifilo/core/credit-cards'

export const toCreditCardResponse = (card: CreditCardDetails): CreditCardResponse => ({
  accountId: card.accountId,
  closingDay: card.closingDay,
  dueDay: card.dueDay,
  limitMinor: card.limitMinor,
  organizationId: card.organizationId,
  version: card.version,
})

export const toInvoiceResponse = (invoice: CardInvoice): InvoiceResponse => ({
  accountId: invoice.accountId,
  closedAt: invoice.closedAt?.toISOString() ?? null,
  dueOn: invoice.dueOn,
  id: invoice.id,
  organizationId: invoice.organizationId,
  paidAt: invoice.paidAt?.toISOString() ?? null,
  periodEnd: invoice.periodEnd,
  periodStart: invoice.periodStart,
  status: invoice.status,
  totalMinor: invoice.totalMinor,
  version: invoice.version,
})

export const toInvoiceItemResponse = (item: InvoiceItem): InvoiceItemResponse => ({
  amountMinor: item.amountMinor,
  description: item.description,
  id: item.id,
  installmentNumber: item.installmentNumber,
  occurredOn: item.occurredOn,
})

export const toInvoiceWithItemsResponse = (input: {
  invoice: CardInvoice
  items: InvoiceItem[]
}): InvoiceWithItemsResponse => ({
  invoice: toInvoiceResponse(input.invoice),
  items: input.items.map(toInvoiceItemResponse),
})
