import { z } from 'zod'

import { moneySchema } from '../contracts/money'
import { MONEY_AMOUNT_MINOR_MAX } from '../primitives'

const dayOfMonthSchema = z
  .int()
  .min(1, 'Informe um dia entre 1 e 31.')
  .max(31, 'Informe um dia entre 1 e 31.')
const positiveAmountMinorSchema = z
  .int()
  .min(1, 'O valor deve ser maior que zero.')
  .max(MONEY_AMOUNT_MINOR_MAX)

export const attachCreditCardRequestSchema = z.object({
  closingDay: dayOfMonthSchema,
  dueDay: dayOfMonthSchema,
  limitMinor: positiveAmountMinorSchema,
})

export const creditCardResponseSchema = z.object({
  accountId: z.string().min(1),
  closingDay: dayOfMonthSchema,
  dueDay: dayOfMonthSchema,
  limitMinor: positiveAmountMinorSchema,
  organizationId: z.string().min(1),
  version: z.int().min(1),
})

export const invoiceStatusSchema = z.enum(['open', 'closed', 'overdue', 'paid'])

export const invoiceResponseSchema = z.object({
  accountId: z.string().min(1),
  closedAt: z.string().datetime().nullable(),
  dueOn: z.iso.date(),
  id: z.string().min(1),
  organizationId: z.string().min(1),
  paidAt: z.string().datetime().nullable(),
  periodEnd: z.iso.date(),
  periodStart: z.iso.date(),
  status: invoiceStatusSchema,
  totalMinor: z.int(),
  version: z.int().min(1),
})

export const invoiceItemResponseSchema = z.object({
  amountMinor: z.int(),
  description: z.string().min(1),
  id: z.string().min(1),
  installmentNumber: z.int().min(1).nullable(),
  occurredOn: z.iso.date(),
})

export const invoiceWithItemsResponseSchema = z.object({
  invoice: invoiceResponseSchema,
  items: z.array(invoiceItemResponseSchema),
})

/**
 * Idempotency lives at the transport boundary (`Idempotency-Key`, Decision
 * 005 / Fase 00), never in this body - the same request body replayed with
 * the same key must be safe to send twice.
 */
export const payInvoiceRequestSchema = z.object({
  fromAccountId: z.string().min(1),
})

export const availableLimitResponseSchema = moneySchema

const installmentDescriptionSchema = z.string().trim().min(1, 'Informe uma descrição.').max(200)
const installmentNotesSchema = z.string().trim().max(1000).nullable()

export const createInstallmentPurchaseRequestSchema = z.object({
  accountId: z.string().min(1),
  categoryId: z.string().min(1),
  description: installmentDescriptionSchema,
  firstOccurredOn: z.iso.date(),
  installments: z.int().min(2, 'Escolha pelo menos 2 parcelas.').max(60),
  notes: installmentNotesSchema.optional(),
  totalMinor: positiveAmountMinorSchema,
})

export const listInvoicesQuerySchema = z.object({})

const creditCardErrorCodeSchema = z.enum([
  'account_archived',
  'account_not_credit_card',
  'account_not_found',
  'category_archived',
  'category_kind_mismatch',
  'category_not_found',
  'credit_card_already_attached',
  'credit_card_not_configured',
  'currency_mismatch',
  'invalid_installment_count',
  'invoice_already_paid',
  'invoice_not_closed',
  'invoice_not_found',
  'limit_out_of_range',
  'version_conflict',
])

export const creditCardErrorResponseSchema = z.object({
  error: z.object({
    code: creditCardErrorCodeSchema,
    message: z.string().min(1),
  }),
})

export type AttachCreditCardRequest = z.infer<typeof attachCreditCardRequestSchema>
export type CreditCardResponse = z.infer<typeof creditCardResponseSchema>
export type InvoiceStatus = z.infer<typeof invoiceStatusSchema>
export type InvoiceResponse = z.infer<typeof invoiceResponseSchema>
export type InvoiceItemResponse = z.infer<typeof invoiceItemResponseSchema>
export type InvoiceWithItemsResponse = z.infer<typeof invoiceWithItemsResponseSchema>
export type PayInvoiceRequest = z.infer<typeof payInvoiceRequestSchema>
export type AvailableLimitResponse = z.infer<typeof availableLimitResponseSchema>
export type CreateInstallmentPurchaseRequest = z.infer<
  typeof createInstallmentPurchaseRequestSchema
>
export type CreditCardErrorResponse = z.infer<typeof creditCardErrorResponseSchema>
