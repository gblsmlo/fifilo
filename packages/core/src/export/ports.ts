import type { CurrencyCode, EntityId } from '../primitives'

/**
 * One row per entry (Decision 021: the entry is the signed leg), joined out
 * to the transaction, account, category and invoice cycle it belongs to -
 * the denormalized shape a spreadsheet reads, not a shape any single table
 * carries.
 */
export type ExportRow = {
  accountName: string
  amountMinor: number
  categoryName: string | null
  currency: CurrencyCode
  description: string
  invoiceId: EntityId | null
  kind: string
  occurredOn: string
  transactionId: EntityId
}

/**
 * The read-only surface `exportTransactionsCsv` needs (Decision 003) - not
 * the full transactions/entries repositories, which carry write methods this
 * use case never calls.
 */
export type ExportReader = {
  transactionRows: (organizationId: string, from: string, to: string) => Promise<ExportRow[]>
}
