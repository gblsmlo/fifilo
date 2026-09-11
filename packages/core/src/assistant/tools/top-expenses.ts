import {
  type DateRangeError,
  type TopExpenseRow,
  type TopExpensesQuery,
  getTopExpenses,
  topExpensesQuerySchema,
} from '../../analytics'
import type { AssistantToolkit } from './toolkit'
import type { AgentTool } from './types'

export type TopExpensesToolInput = Omit<TopExpensesQuery, 'organizationId'>

export const topExpensesTool: AgentTool<
  TopExpensesToolInput,
  TopExpenseRow[],
  AssistantToolkit,
  DateRangeError
> = {
  description: 'As N maiores despesas do período, da maior para a menor.',
  async execute(input, context, toolkit) {
    return getTopExpenses(
      {
        from: input.from,
        limit: input.limit,
        organizationId: context.organizationId,
        to: input.to,
      },
      toolkit.analyticsReader,
    )
  },
  inputSchema: topExpensesQuerySchema,
  name: 'top_expenses',
}
