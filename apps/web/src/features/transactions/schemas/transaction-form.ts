import {
  createExpenseRequestSchema,
  createIncomeRequestSchema,
  createTransferRequestSchema,
} from '@fifilo/core/transactions'
import type { z } from 'zod'

export const expenseFormSchema = createExpenseRequestSchema
export const incomeFormSchema = createIncomeRequestSchema
export const transferFormSchema = createTransferRequestSchema

export type ExpenseFormInput = z.input<typeof expenseFormSchema>
export type ExpenseFormValues = z.infer<typeof expenseFormSchema>
export type IncomeFormInput = z.input<typeof incomeFormSchema>
export type IncomeFormValues = z.infer<typeof incomeFormSchema>
export type TransferFormInput = z.input<typeof transferFormSchema>
export type TransferFormValues = z.infer<typeof transferFormSchema>
