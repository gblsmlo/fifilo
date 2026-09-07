import { z } from 'zod'

export const exportTransactionsQuerySchema = z.object({
  from: z.iso.date(),
  to: z.iso.date(),
})

export type ExportTransactionsQueryContract = z.infer<typeof exportTransactionsQuerySchema>
