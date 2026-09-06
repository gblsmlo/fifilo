import { z } from 'zod'

import { accountKindSchema } from '../accounts'

const dateRangeQuerySchema = z.object({
  from: z.iso.date(),
  to: z.iso.date(),
})

export const monthlyCashflowQuerySchema = dateRangeQuerySchema

export const monthlyCashflowPointSchema = z.object({
  expenseMinor: z.int(),
  incomeMinor: z.int(),
  month: z.string().regex(/^\d{4}-\d{2}$/),
})

export const monthlyCashflowResponseSchema = z.array(monthlyCashflowPointSchema)

export const spendByCategoryQuerySchema = dateRangeQuerySchema.extend({
  kind: z.enum(['expense', 'income']),
})

export const categorySpendShareSchema = z.object({
  categoryId: z.string().min(1),
  categoryName: z.string().min(1),
  parentId: z.string().min(1).nullable(),
  percentage: z.number(),
  totalMinor: z.int(),
})

export const spendByCategoryResponseSchema = z.array(categorySpendShareSchema)

export const balanceEvolutionQuerySchema = dateRangeQuerySchema.extend({
  accountId: z.string().min(1).optional(),
})

const balancePointSchema = z.object({
  balanceMinor: z.int(),
  date: z.iso.date(),
})

export const balanceEvolutionResponseSchema = z.object({
  accounts: z.array(
    z.object({
      accountId: z.string().min(1),
      points: z.array(balancePointSchema),
    }),
  ),
  consolidated: z.array(balancePointSchema),
})

export const consolidatedBalanceQuerySchema = z.object({
  asOf: z.iso.date(),
})

export const consolidatedBalanceResponseSchema = z.object({
  availableCashMinor: z.int(),
  committedInvoiceMinor: z.int(),
  netMinor: z.int(),
})

export const topExpensesQuerySchema = dateRangeQuerySchema.extend({
  limit: z.coerce.number().int().min(1).max(50).default(10),
})

export const topExpenseRowSchema = z.object({
  amountMinor: z.int(),
  categoryName: z.string().nullable(),
  description: z.string().min(1),
  occurredOn: z.iso.date(),
  transactionId: z.string().min(1),
})

export const topExpensesResponseSchema = z.array(topExpenseRowSchema)

export const spendByAccountQuerySchema = dateRangeQuerySchema

export const accountSpendRowSchema = z.object({
  accountId: z.string().min(1),
  accountName: z.string().min(1),
  kind: accountKindSchema,
  totalMinor: z.int(),
})

export const spendByAccountResponseSchema = z.array(accountSpendRowSchema)

const analyticsErrorCodeSchema = z.enum(['invalid_date_range'])

export const analyticsErrorResponseSchema = z.object({
  error: z.object({
    code: analyticsErrorCodeSchema,
    message: z.string().min(1),
  }),
})

export type MonthlyCashflowQueryContract = z.infer<typeof monthlyCashflowQuerySchema>
export type MonthlyCashflowResponse = z.infer<typeof monthlyCashflowResponseSchema>
export type SpendByCategoryQueryContract = z.infer<typeof spendByCategoryQuerySchema>
export type SpendByCategoryResponse = z.infer<typeof spendByCategoryResponseSchema>
export type BalanceEvolutionQueryContract = z.infer<typeof balanceEvolutionQuerySchema>
export type BalanceEvolutionResponse = z.infer<typeof balanceEvolutionResponseSchema>
export type ConsolidatedBalanceQueryContract = z.infer<typeof consolidatedBalanceQuerySchema>
export type ConsolidatedBalanceResponse = z.infer<typeof consolidatedBalanceResponseSchema>
export type TopExpensesQueryContract = z.infer<typeof topExpensesQuerySchema>
export type TopExpensesResponse = z.infer<typeof topExpensesResponseSchema>
export type SpendByAccountQueryContract = z.infer<typeof spendByAccountQuerySchema>
export type SpendByAccountResponse = z.infer<typeof spendByAccountResponseSchema>
export type AnalyticsErrorResponse = z.infer<typeof analyticsErrorResponseSchema>
