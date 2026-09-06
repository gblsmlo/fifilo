export type { DateRangeError } from './date-range'
export { validateDateRange } from './date-range'
export type {
  AccountBalanceSeries,
  AccountSpendRow,
  AnalyticsReader,
  BalancePoint,
  CategorySpendRow,
  DateRangeQuery,
  MonthlyCashflowPoint,
  TopExpenseRow,
} from './ports'
export type {
  AnalyticsErrorResponse,
  BalanceEvolutionQueryContract,
  BalanceEvolutionResponse,
  ConsolidatedBalanceQueryContract,
  ConsolidatedBalanceResponse,
  MonthlyCashflowQueryContract,
  MonthlyCashflowResponse,
  SpendByAccountQueryContract,
  SpendByAccountResponse,
  SpendByCategoryQueryContract,
  SpendByCategoryResponse,
  TopExpensesQueryContract,
  TopExpensesResponse,
} from './schemas'
export {
  accountSpendRowSchema,
  analyticsErrorResponseSchema,
  balanceEvolutionQuerySchema,
  balanceEvolutionResponseSchema,
  categorySpendShareSchema,
  consolidatedBalanceQuerySchema,
  consolidatedBalanceResponseSchema,
  monthlyCashflowPointSchema,
  monthlyCashflowQuerySchema,
  monthlyCashflowResponseSchema,
  spendByAccountQuerySchema,
  spendByAccountResponseSchema,
  spendByCategoryQuerySchema,
  spendByCategoryResponseSchema,
  topExpenseRowSchema,
  topExpensesQuerySchema,
  topExpensesResponseSchema,
} from './schemas'
export type {
  BalanceEvolutionQuery,
  BalanceEvolutionResult,
} from './use-cases/get-balance-evolution'
export { getBalanceEvolution } from './use-cases/get-balance-evolution'
export type {
  ConsolidatedBalanceQuery,
  ConsolidatedBalanceResult,
} from './use-cases/get-consolidated-balance'
export { getConsolidatedBalance } from './use-cases/get-consolidated-balance'
export type { MonthlyCashflowQuery } from './use-cases/get-monthly-cashflow'
export { getMonthlyCashflow } from './use-cases/get-monthly-cashflow'
export type { SpendByAccountQuery } from './use-cases/get-spend-by-account'
export { getSpendByAccount } from './use-cases/get-spend-by-account'
export type { CategorySpendShare, SpendByCategoryQuery } from './use-cases/get-spend-by-category'
export { getSpendByCategory } from './use-cases/get-spend-by-category'
export type { TopExpensesQuery } from './use-cases/get-top-expenses'
export { getTopExpenses } from './use-cases/get-top-expenses'
