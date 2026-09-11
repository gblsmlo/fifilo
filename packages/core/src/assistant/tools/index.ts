import { accountBalancesTool } from './account-balances'
import { cashflowByMonthTool } from './cashflow-by-month'
import { creditCardInvoiceTool } from './credit-card-invoice'
import { listTransactionsTool } from './list-transactions'
import { spendByCategoryTool } from './spend-by-category'
import type { AssistantToolkit } from './toolkit'
import { topExpensesTool } from './top-expenses'
import { type ErasedAgentTool, eraseAgentTool } from './types'

/**
 * Every tool this fase ships (Fase 08 § Ferramentas) - a name with no entry
 * here does not exist as a tool; needing one is a sign a use case is
 * missing, written first, with its own test (the same rule Decision 016
 * applies to a parent issue). Erased once, here, rather than at every call
 * site that needs to hold tools of different shapes in one collection.
 */
export const ASSISTANT_TOOLS: readonly ErasedAgentTool<AssistantToolkit>[] = [
  eraseAgentTool(listTransactionsTool),
  eraseAgentTool(accountBalancesTool),
  eraseAgentTool(cashflowByMonthTool),
  eraseAgentTool(spendByCategoryTool),
  eraseAgentTool(creditCardInvoiceTool),
  eraseAgentTool(topExpensesTool),
]

export const findAssistantTool = (name: string): ErasedAgentTool<AssistantToolkit> | undefined =>
  ASSISTANT_TOOLS.find((tool) => tool.name === name)

export { accountBalancesTool } from './account-balances'
export { cashflowByMonthTool } from './cashflow-by-month'
export { creditCardInvoiceTool } from './credit-card-invoice'
export { listTransactionsTool } from './list-transactions'
export { spendByCategoryTool } from './spend-by-category'
export type { AssistantToolkit } from './toolkit'
export { topExpensesTool } from './top-expenses'
export type {
  AgentTool,
  ErasedAgentTool,
  ToolExecutionContext,
  ToolInputInvalidError,
} from './types'
