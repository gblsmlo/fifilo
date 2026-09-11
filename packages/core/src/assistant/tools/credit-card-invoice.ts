import { z } from 'zod'
import {
  type GetInvoiceError,
  type InvoiceWithItems,
  getInvoice,
  listInvoices,
} from '../../credit-cards'
import { type Result, err } from '../../result'
import type { AssistantToolkit } from './toolkit'
import type { AgentTool } from './types'

/**
 * No pre-existing route contract combines "an account" with "optionally one
 * specific invoice" (the route encodes the account as a URL param, per
 * `GET /api/credit-cards/:id/invoices`) - this schema is this tool's own,
 * not a second source for an existing one (Fase 08 § Ferramentas' rule is
 * about not duplicating a contract that already exists; none does here).
 */
export const creditCardInvoiceToolInputSchema = z.object({
  accountId: z.string().min(1),
  /** Omitted: resolves to the most recent invoice for the account. */
  invoiceId: z.string().min(1).optional(),
})

export type CreditCardInvoiceToolInput = z.infer<typeof creditCardInvoiceToolInputSchema>

export const creditCardInvoiceTool: AgentTool<
  CreditCardInvoiceToolInput,
  InvoiceWithItems,
  AssistantToolkit,
  GetInvoiceError
> = {
  description:
    'Fatura de um cartão de crédito com seus itens - a mais recente por padrão, ou uma específica pelo id.',
  async execute(input, context, toolkit): Promise<Result<InvoiceWithItems, GetInvoiceError>> {
    const invoiceId =
      input.invoiceId ??
      (
        await listInvoices(
          {
            accountId: input.accountId as never,
            organizationId: context.organizationId,
            today: context.today,
          },
          toolkit.invoiceRepository,
        )
      )[0]?.id

    if (!invoiceId) {
      return err({
        code: 'invoice_not_found',
        kind: 'not_found',
        message: 'No invoice found for this account.',
      })
    }

    return getInvoice(
      { id: invoiceId as never, organizationId: context.organizationId, today: context.today },
      toolkit.invoiceRepository,
      toolkit.invoiceItemReader,
    )
  },
  inputSchema: creditCardInvoiceToolInputSchema,
  name: 'credit_card_invoice',
}
