import type { ExportRow } from './ports'

const CSV_COLUMNS = [
  'occurredOn',
  'kind',
  'description',
  'categoryName',
  'accountName',
  'amountMinor',
  'currency',
  'invoiceId',
  'transactionId',
] as const

/**
 * RFC 4180 escaping, plus a leading apostrophe on any value a spreadsheet
 * would otherwise read as a formula (`=`, `+`, `-`, `@`) - a CSV a person
 * downloads and opens is one of the few HTTP responses this codebase hands
 * straight to a desktop application, and financial `description` is
 * free text a user typed.
 */
const escapeCell = (value: string): string => {
  const guarded = /^[=+\-@]/.test(value) ? `'${value}` : value
  return /[",\n]/.test(guarded) ? `"${guarded.replaceAll('"', '""')}"` : guarded
}

const toCell = (row: ExportRow, column: (typeof CSV_COLUMNS)[number]): string => {
  const value = row[column]
  return value === null ? '' : String(value)
}

/** Pure formatting, no I/O (Decision 003's port carries the query; this shapes what it returns). */
export const toCsv = (rows: ExportRow[]): string => {
  const lines = [CSV_COLUMNS.join(',')]
  for (const row of rows) {
    lines.push(CSV_COLUMNS.map((column) => escapeCell(toCell(row, column))).join(','))
  }
  return `${lines.join('\r\n')}\r\n`
}
