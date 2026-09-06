import { z } from 'zod'

/**
 * The dashboard's URL state: reloading the page must reproduce the same
 * period (Fase 02 § Web's argument, applied here). Missing `from`/`to`
 * default to "this month" in the page itself, the same way
 * `transactions/route-search.ts` leaves its own filters unset.
 */
export const analyticsSearchSchema = z.object({
  from: z.iso.date().optional(),
  to: z.iso.date().optional(),
})

export type AnalyticsSearch = z.infer<typeof analyticsSearchSchema>

export const validateAnalyticsSearch = (search: Record<string, unknown>): AnalyticsSearch =>
  analyticsSearchSchema.parse(search)
