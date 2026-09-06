import { z } from 'zod'

import { currencyCodeSchema, moneySchema } from '../contracts/money'

export const accountKindSchema = z.enum([
  'checking',
  'savings',
  'wallet',
  'credit_card',
  'investment',
])

const accountNameSchema = z.string().trim().min(1).max(120)
const accountColorSchema = z.string().trim().min(1).max(32).nullable()
const accountIconSchema = z.string().trim().min(1).max(64).nullable()
const accountInstitutionSchema = z.string().trim().min(1).max(120).nullable()

export const accountResponseSchema = z.object({
  archivedAt: z.string().datetime().nullable(),
  color: accountColorSchema,
  createdAt: z.string().datetime(),
  currency: currencyCodeSchema,
  icon: accountIconSchema,
  id: z.string().min(1),
  institution: accountInstitutionSchema,
  kind: accountKindSchema,
  name: accountNameSchema,
  organizationId: z.string().min(1),
  updatedAt: z.string().datetime(),
  version: z.int().min(1),
})

/**
 * The opening balance is optional; when present it becomes the account's
 * first entry (Fase 01 § Modelagem), so the civil date it happened on
 * (Decision 018) is required alongside it — the domain never assumes "today".
 */
export const createAccountRequestSchema = z
  .object({
    color: accountColorSchema.optional(),
    icon: accountIconSchema.optional(),
    institution: accountInstitutionSchema.optional(),
    kind: accountKindSchema,
    name: accountNameSchema,
    openingBalanceDate: z.iso.date().optional(),
    openingBalanceMinor: moneySchema.shape.amountMinor.optional(),
  })
  .refine((input) => !input.openingBalanceMinor || Boolean(input.openingBalanceDate), {
    error: 'Informe a data do saldo de abertura.',
    path: ['openingBalanceDate'],
  })

export const updateAccountRequestSchema = z.object({
  color: accountColorSchema.optional(),
  icon: accountIconSchema.optional(),
  institution: accountInstitutionSchema.optional(),
  name: accountNameSchema.optional(),
  version: z.int().min(1),
})

export const listAccountsQuerySchema = z.object({
  includeArchived: z.coerce.boolean().default(false),
})

export const accountBalanceSchema = z.object({
  accountId: z.string().min(1),
  balance: moneySchema,
})

export const accountBalancesResponseSchema = z.object({
  accounts: z.array(accountBalanceSchema),
  consolidated: moneySchema,
})

const accountErrorCodeSchema = z.enum([
  'account_name_taken',
  'account_not_found',
  'version_conflict',
])

export const accountErrorResponseSchema = z.object({
  error: z.object({
    code: accountErrorCodeSchema,
    message: z.string().min(1),
  }),
})

export type AccountKind = z.infer<typeof accountKindSchema>
export type AccountResponse = z.infer<typeof accountResponseSchema>
export type CreateAccountRequest = z.infer<typeof createAccountRequestSchema>
export type UpdateAccountRequest = z.infer<typeof updateAccountRequestSchema>
export type ListAccountsQuery = z.infer<typeof listAccountsQuerySchema>
export type AccountBalancesResponse = z.infer<typeof accountBalancesResponseSchema>
export type AccountErrorResponse = z.infer<typeof accountErrorResponseSchema>
