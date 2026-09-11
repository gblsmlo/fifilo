import {
  type ConsolidatedBalanceQuery,
  type ConsolidatedBalanceResult,
  consolidatedBalanceQuerySchema,
  getConsolidatedBalance,
} from '../../analytics'
import type { AssistantToolkit } from './toolkit'
import type { AgentTool } from './types'

export type AccountBalancesToolInput = Omit<ConsolidatedBalanceQuery, 'organizationId'>

export const accountBalancesTool: AgentTool<
  AccountBalancesToolInput,
  ConsolidatedBalanceResult,
  AssistantToolkit
> = {
  description:
    'Saldo consolidado do workspace em uma data: disponível em caixa, comprometido em fatura de cartão e o líquido.',
  async execute(input, context, toolkit) {
    return getConsolidatedBalance(
      { asOf: input.asOf, organizationId: context.organizationId },
      toolkit.analyticsReader,
    )
  },
  inputSchema: consolidatedBalanceQuerySchema,
  name: 'account_balances',
}
