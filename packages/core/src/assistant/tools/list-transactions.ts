import { z } from 'zod'
import { ok } from '../../result'
import { listTransactions, transactionKindSchema } from '../../transactions'
import type { AssistantToolkit } from './toolkit'
import type { AgentTool } from './types'

/**
 * No `cursor` (unlike the route's own `listTransactionsQuerySchema`): a
 * page cursor is an API-layer encoding (Decision 014), and a chat turn
 * asking for "more" is better served by narrowing the date range than by
 * an LLM remembering an opaque token across turns. `limit` caps lower than
 * the route's own 100 - a tool result becomes provider input, not a page a
 * person scrolls.
 */
export const listTransactionsToolInputSchema = z.object({
  accountId: z.string().min(1).optional(),
  categoryId: z.string().min(1).optional(),
  from: z.iso.date().optional(),
  kind: transactionKindSchema.optional(),
  limit: z.int().min(1).max(30).default(10),
  q: z.string().trim().max(200).optional(),
  to: z.iso.date().optional(),
})

export type ListTransactionsToolInput = z.infer<typeof listTransactionsToolInputSchema>

export const listTransactionsTool: AgentTool<
  ListTransactionsToolInput,
  Awaited<ReturnType<typeof listTransactions>>,
  AssistantToolkit
> = {
  description:
    'Lista as transações do workspace no período e filtros informados (conta, categoria, tipo, texto de busca).',
  async execute(input, context, toolkit) {
    const page = await listTransactions(
      {
        accountId: input.accountId as never,
        categoryId: input.categoryId as never,
        from: input.from,
        kind: input.kind,
        limit: input.limit,
        organizationId: context.organizationId,
        q: input.q,
        to: input.to,
      },
      toolkit.transactionRepository,
    )
    return ok(page)
  },
  inputSchema: listTransactionsToolInputSchema,
  name: 'list_transactions',
}
