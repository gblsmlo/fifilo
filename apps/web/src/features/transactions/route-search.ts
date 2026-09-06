import { z } from 'zod'

/**
 * The route's URL state: reloading the page must reproduce the same filter
 * (Fase 02 § Web). A Zod contract, not a hand-rolled parser, so an invalid
 * query string degrades to "no filter" instead of a route crash.
 */
export const transactionsSearchSchema = z.object({
  accountId: z.string().min(1).optional(),
  categoryId: z.string().min(1).optional(),
  from: z.iso.date().optional(),
  kind: z.enum(['income', 'expense', 'transfer']).optional(),
  q: z.string().trim().min(1).optional(),
  to: z.iso.date().optional(),
})

export type TransactionsSearch = z.infer<typeof transactionsSearchSchema>

export const validateTransactionsSearch = (search: Record<string, unknown>): TransactionsSearch =>
  transactionsSearchSchema.parse(search)
