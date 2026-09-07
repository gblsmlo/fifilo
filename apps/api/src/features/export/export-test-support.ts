import type { ExportReader, ExportRow } from '@fifilo/core/export'

/**
 * An in-memory stand-in for the Drizzle adapter, local to this feature's
 * route tests, mirroring `analytics-test-support.ts`'s own note.
 */
export const createFakeExportReader = (rows: ExportRow[] = []): ExportReader => ({
  async transactionRows() {
    return rows
  },
})
