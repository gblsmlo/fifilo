import type { AnalyticsReader } from '@fifilo/core/analytics'

import { createAnalyticsReader as createAnalyticsReaderPersistence } from './analytics-persistence'

/** Composition root only (Decision 003): no SQL or aggregation rule lives here. */
export const createAnalyticsReader = (): AnalyticsReader => createAnalyticsReaderPersistence()
