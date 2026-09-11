import {
  type CategorySpendShare,
  type DateRangeError,
  type SpendByCategoryQuery,
  getSpendByCategory,
  spendByCategoryQuerySchema,
} from '../../analytics'
import type { AssistantToolkit } from './toolkit'
import type { AgentTool } from './types'

export type SpendByCategoryToolInput = Omit<SpendByCategoryQuery, 'organizationId'>

export const spendByCategoryTool: AgentTool<
  SpendByCategoryToolInput,
  CategorySpendShare[],
  AssistantToolkit,
  DateRangeError
> = {
  description:
    'Gasto (ou receita) por categoria no período, com o percentual de cada categoria sobre o total.',
  async execute(input, context, toolkit) {
    return getSpendByCategory(
      { from: input.from, kind: input.kind, organizationId: context.organizationId, to: input.to },
      toolkit.analyticsReader,
    )
  },
  inputSchema: spendByCategoryQuerySchema,
  name: 'spend_by_category',
}
