import type { FakeAnalyticsFixtures } from '../../analytics/use-cases/fake-analytics-reader'
import { createFakeAnalyticsReader } from '../../analytics/use-cases/fake-analytics-reader'
import type { CardInvoice, InvoiceItem, InvoiceItemReader } from '../../credit-cards'
import { createFakeInvoiceRepository } from '../../credit-cards/use-cases/fake-invoice-repository'
import type { Transaction } from '../../transactions/transaction'
import { createFakeTransactionRepository } from '../../transactions/use-cases/fake-transaction-repository'
import type { AssistantToolkit } from './toolkit'

/** Keyed by invoice id in the fixture itself - `InvoiceItem` carries no `invoiceId` of its own, the same way the real query's `WHERE` clause supplies it rather than the row. */
export const createFakeInvoiceItemReader = (
  itemsByInvoiceId: Record<string, InvoiceItem[]> = {},
): InvoiceItemReader => ({
  async listByInvoice(_organizationId, invoiceId) {
    return itemsByInvoiceId[invoiceId] ?? []
  },
})

export const createFakeAssistantToolkit = (
  fixtures: {
    analytics?: FakeAnalyticsFixtures
    invoiceItemsByInvoiceId?: Record<string, InvoiceItem[]>
    invoices?: CardInvoice[]
    transactions?: Transaction[]
  } = {},
): AssistantToolkit => ({
  analyticsReader: createFakeAnalyticsReader(fixtures.analytics),
  invoiceItemReader: createFakeInvoiceItemReader(fixtures.invoiceItemsByInvoiceId),
  invoiceRepository: createFakeInvoiceRepository(fixtures.invoices),
  transactionRepository: createFakeTransactionRepository(fixtures.transactions),
})
