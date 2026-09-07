import {
  type AccessControlError,
  type WorkspaceRole,
  requireExportAccess,
} from '../../access-control'
import { type DateRangeError, validateDateRange } from '../../analytics'
import { type Result, ok } from '../../result'
import { toCsv } from '../csv'
import type { ExportReader } from '../ports'

export type ExportTransactionsCommand = {
  from: string
  organizationId: string
  role: WorkspaceRole
  to: string
}

export type ExportTransactionsError = AccessControlError | DateRangeError

export const exportTransactionsCsv = async (
  command: ExportTransactionsCommand,
  reader: ExportReader,
): Promise<Result<string, ExportTransactionsError>> => {
  const access = requireExportAccess(command.role)
  if (!access.ok) return access

  const range = validateDateRange(command.from, command.to)
  if (!range.ok) return range

  const rows = await reader.transactionRows(command.organizationId, command.from, command.to)
  return ok(toCsv(rows))
}
