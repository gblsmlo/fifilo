import type { ExportReader, ExportRow } from '../ports'

export const createFakeExportReader = (rows: ExportRow[] = []): ExportReader => ({
  async transactionRows() {
    return rows
  },
})
