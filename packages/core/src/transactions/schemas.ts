import { z } from 'zod'

import { MONEY_AMOUNT_MINOR_MAX } from '../primitives'

export const transactionKindSchema = z.enum(['income', 'expense', 'transfer'])

/**
 * Always positive: the sign is derived server-side from `kind`
 * (`deriveLegs`), never taken from the client (Fase 02 § Riscos).
 */
const positiveAmountMinorSchema = z
  .int()
  .min(1, 'O valor deve ser maior que zero.')
  .max(MONEY_AMOUNT_MINOR_MAX)
const descriptionSchema = z.string().trim().min(1, 'Informe uma descrição.').max(200)
const notesSchema = z.string().trim().max(1000).nullable()

const incomeExpenseBaseSchema = z.object({
  accountId: z.string().min(1),
  amountMinor: positiveAmountMinorSchema,
  categoryId: z.string().min(1),
  description: descriptionSchema,
  notes: notesSchema.optional(),
  occurredOn: z.iso.date(),
})

export const createIncomeRequestSchema = incomeExpenseBaseSchema.extend({
  kind: z.literal('income'),
})
export const createExpenseRequestSchema = incomeExpenseBaseSchema.extend({
  kind: z.literal('expense'),
})

export const createTransferRequestSchema = z.object({
  amountMinor: positiveAmountMinorSchema,
  description: descriptionSchema,
  fromAccountId: z.string().min(1),
  kind: z.literal('transfer'),
  notes: notesSchema.optional(),
  occurredOn: z.iso.date(),
  toAccountId: z.string().min(1),
})

const sameAccountRefine = <
  T extends { fromAccountId?: string; kind: string; toAccountId?: string },
>(
  input: T,
) => input.kind !== 'transfer' || input.fromAccountId !== input.toAccountId

export const createTransactionRequestSchema = z
  .discriminatedUnion('kind', [
    createIncomeRequestSchema,
    createExpenseRequestSchema,
    createTransferRequestSchema,
  ])
  .refine(sameAccountRefine, {
    error: 'Selecione contas diferentes para a transferência.',
    path: ['toAccountId'],
  })

/** Editing never changes `kind`: the fields it would need to swap to are disjoint. */
export const updateTransactionRequestSchema = z
  .discriminatedUnion('kind', [
    createIncomeRequestSchema.extend({ version: z.int().min(1) }),
    createExpenseRequestSchema.extend({ version: z.int().min(1) }),
    createTransferRequestSchema.extend({ version: z.int().min(1) }),
  ])
  .refine(sameAccountRefine, {
    error: 'Selecione contas diferentes para a transferência.',
    path: ['toAccountId'],
  })

export const transactionLegResponseSchema = z.object({
  accountId: z.string().min(1),
  amountMinor: z.int(),
})

export const transactionResponseSchema = z.object({
  categoryId: z.string().min(1).nullable(),
  createdAt: z.string().datetime(),
  description: descriptionSchema,
  id: z.string().min(1),
  kind: transactionKindSchema,
  legs: z.array(transactionLegResponseSchema),
  notes: notesSchema,
  occurredOn: z.iso.date(),
  organizationId: z.string().min(1),
  updatedAt: z.string().datetime(),
  version: z.int().min(1),
})

export const listTransactionsQuerySchema = z.object({
  accountId: z.string().min(1).optional(),
  categoryId: z.string().min(1).optional(),
  cursor: z.string().min(1).optional(),
  from: z.iso.date().optional(),
  kind: transactionKindSchema.optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  q: z.string().trim().max(200).optional(),
  to: z.iso.date().optional(),
})

export const transactionsPageResponseSchema = z.object({
  items: z.array(transactionResponseSchema),
  nextCursor: z.string().nullable(),
})

const transactionErrorCodeSchema = z.enum([
  'account_archived',
  'account_not_found',
  'category_kind_mismatch',
  'category_not_found',
  'currency_mismatch',
  'transaction_kind_immutable',
  'transaction_not_found',
  'version_conflict',
])

export const transactionErrorResponseSchema = z.object({
  error: z.object({
    code: transactionErrorCodeSchema,
    message: z.string().min(1),
  }),
})

export type TransactionKind = z.infer<typeof transactionKindSchema>
export type CreateTransactionRequest = z.infer<typeof createTransactionRequestSchema>
export type UpdateTransactionRequest = z.infer<typeof updateTransactionRequestSchema>
export type TransactionResponse = z.infer<typeof transactionResponseSchema>
export type ListTransactionsQuery = z.infer<typeof listTransactionsQuerySchema>
export type TransactionsPageResponse = z.infer<typeof transactionsPageResponseSchema>
export type TransactionErrorResponse = z.infer<typeof transactionErrorResponseSchema>
