import type { InvoiceItemResponse, InvoiceResponse } from '@fifilo/core/credit-cards'
import { generateEntityId } from '@fifilo/core/primitives'

/** Mock data for the Credit Cards stories. Server messages here, not product copy. */
export const creditCardsStoryFixtures = {
  unreachableMessage: 'Não foi possível falar com o servidor. Tente novamente.',
} as const

export const buildStoryInvoice = (overrides: Partial<InvoiceResponse> = {}): InvoiceResponse => ({
  accountId: 'account_story',
  closedAt: null,
  dueOn: '2026-06-20',
  id: generateEntityId(),
  organizationId: 'org_story',
  paidAt: null,
  periodEnd: '2026-06-10',
  periodStart: '2026-05-11',
  status: 'open',
  totalMinor: 0,
  version: 1,
  ...overrides,
})

export const buildStoryInvoiceItem = (
  overrides: Partial<InvoiceItemResponse> = {},
): InvoiceItemResponse => ({
  amountMinor: -5_000,
  description: 'Supermercado',
  id: generateEntityId(),
  installmentNumber: null,
  occurredOn: '2026-06-05',
  ...overrides,
})
