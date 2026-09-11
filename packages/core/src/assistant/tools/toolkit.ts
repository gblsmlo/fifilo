import type { AnalyticsReader } from '../../analytics'
import type { InvoiceItemReader, InvoiceRepository } from '../../credit-cards'
import type { TransactionRepository } from '../../transactions'

/**
 * The read-only surface every tool in this fase composes with (Decision
 * 003: the persistence a use case needs, not a database connection) - the
 * same ports the routes for these projections already use, so a tool
 * inherits their RLS and their correctness for free (Fase 08 § "A regra que
 * sustenta a fase").
 */
export type AssistantToolkit = {
  analyticsReader: AnalyticsReader
  invoiceItemReader: InvoiceItemReader
  invoiceRepository: InvoiceRepository
  transactionRepository: TransactionRepository
}
