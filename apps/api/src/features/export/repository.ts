import type { ExportReader } from '@fifilo/core/export'

import { createExportReader as createExportReaderPersistence } from './export-persistence'

/** Composition root only (Decision 003): no SQL or persistence rule lives here. */
export const createExportReader = (): ExportReader => createExportReaderPersistence()
