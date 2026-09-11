import {
  type DateRangeError,
  type MonthlyCashflowPoint,
  type MonthlyCashflowQuery,
  getMonthlyCashflow,
  monthlyCashflowQuerySchema,
} from '../../analytics'
import type { AssistantToolkit } from './toolkit'
import type { AgentTool } from './types'

export type CashflowByMonthToolInput = Omit<MonthlyCashflowQuery, 'organizationId'>

export const cashflowByMonthTool: AgentTool<
  CashflowByMonthToolInput,
  MonthlyCashflowPoint[],
  AssistantToolkit,
  DateRangeError
> = {
  description: 'Fluxo de caixa por mês no período: receita, despesa e o líquido de cada mês.',
  async execute(input, context, toolkit) {
    return getMonthlyCashflow(
      { from: input.from, organizationId: context.organizationId, to: input.to },
      toolkit.analyticsReader,
    )
  },
  inputSchema: monthlyCashflowQuerySchema,
  name: 'cashflow_by_month',
}
