import { toWorkspaceRole } from '@fifilo/core/access-control'
import type {
  CardAccountLookup,
  CreditCardRepository,
  InstallmentPlanRepository,
  InvoiceItemReader,
  InvoiceRepository,
} from '@fifilo/core/credit-cards'
import {
  attachCreditCard,
  attachCreditCardRequestSchema,
  availableLimitResponseSchema,
  closeInvoice,
  createInstallmentPurchase,
  createInstallmentPurchaseRequestSchema,
  creditCardResponseSchema,
  getAvailableLimit,
  getInvoice,
  invoiceResponseSchema,
  invoiceWithItemsResponseSchema,
  listInvoices,
  payInvoice,
  payInvoiceRequestSchema,
} from '@fifilo/core/credit-cards'
import type { EntityId } from '@fifilo/core/primitives'
import type {
  AccountLookup,
  CategoryLookup,
  TransactionRepository,
} from '@fifilo/core/transactions'
import type { AuditEvent } from '@fifilo/observability/runtime'
import { auditEvent as recordAuditEvent } from '@fifilo/observability/runtime'
import { Elysia } from 'elysia'
import { z } from 'zod'

import { toHttpErrorResponse } from '../../libs/domain-error-status'
import { errorStatuses, mapValidationError } from '../../libs/http-errors'
import type { IdempotencyStore } from '../../libs/idempotency'
import { withIdempotency } from '../../libs/idempotency'
import { createDrizzleIdempotencyStore } from '../../libs/idempotency-persistence'
import { workspaceToday } from '../../libs/workspace-today'
import type { ActorResolver } from '../auth'
import { createAuthGuard, requireActorContext } from '../auth'
import {
  createAccountLookup,
  createCategoryLookup,
  createTransactionRepository,
} from '../transactions/repository'
import {
  toCreditCardResponse,
  toInvoiceResponse,
  toInvoiceWithItemsResponse,
} from './credit-cards.mapper'
import {
  createCardAccountLookup,
  createCreditCardRepository,
  createInstallmentPlanRepository,
  createInvoiceItemLookup,
  createInvoiceRepository,
} from './repository'

const accountIdParamsSchema = z.object({ id: z.string().min(1) })
const cardInvoiceParamsSchema = z.object({ id: z.string().min(1), invoiceId: z.string().min(1) })
const invoiceIdParamsSchema = z.object({ id: z.string().min(1) })

/**
 * A domain `Result` error carried through `withIdempotency`'s `execute`,
 * which only ever returns a success value or throws (Fase 00 § idempotency).
 * Unwrapped right after, in the same route (mirrors `transactions.routes.ts`).
 */
class DomainResultError<E> extends Error {
  constructor(readonly domainError: E) {
    super('domain result error')
    this.name = 'DomainResultError'
  }
}

export type CreditCardRouteDependencies = {
  accountLookup?: AccountLookup
  auditEvent?: (event: AuditEvent) => void
  cardAccountLookup?: CardAccountLookup
  categoryLookup?: CategoryLookup
  creditCardRepository?: CreditCardRepository
  idempotencyStore?: IdempotencyStore
  installmentPlanRepository?: InstallmentPlanRepository
  invoiceItemLookup?: InvoiceItemReader
  invoiceRepository?: InvoiceRepository
  resolveActor?: ActorResolver
  transactionRepository?: TransactionRepository
}

/**
 * Spans four URL prefixes (Fase 03 § API: `/api/accounts/:id/credit-card`,
 * `/api/credit-cards`, `/api/invoices`, `/api/transactions/installments`) -
 * one Elysia instance with full literal paths rather than one per prefix,
 * since none of the four owns enough of this feature to be "the" prefix.
 * `:id` in a `/api/credit-cards/...` path is the account id: a credit card
 * has no identity of its own beyond the account it is attached to
 * (`credit_card_details`'s own primary key, Fase 03 § Persistência).
 */
export const createCreditCardRoutes = ({
  accountLookup = createAccountLookup(),
  auditEvent = recordAuditEvent,
  cardAccountLookup = createCardAccountLookup(),
  categoryLookup = createCategoryLookup(),
  creditCardRepository = createCreditCardRepository(),
  idempotencyStore = createDrizzleIdempotencyStore(),
  installmentPlanRepository = createInstallmentPlanRepository(),
  invoiceItemLookup = createInvoiceItemLookup(),
  invoiceRepository = createInvoiceRepository(),
  resolveActor,
  transactionRepository = createTransactionRepository(),
}: CreditCardRouteDependencies = {}) =>
  new Elysia()
    .onError(mapValidationError)
    .use(createAuthGuard({ resolveActor }))
    .post(
      '/api/accounts/:id/credit-card',
      async ({ actorContext, body, params, set }) => {
        const context = requireActorContext(actorContext)
        const result = await attachCreditCard(
          {
            accountId: params.id as EntityId,
            closingDay: body.closingDay,
            dueDay: body.dueDay,
            limitMinor: body.limitMinor,
            organizationId: context.organizationId,
            role: toWorkspaceRole(context.role),
          },
          creditCardRepository,
          cardAccountLookup,
        )

        if (!result.ok) {
          const httpError = toHttpErrorResponse(result.error)
          set.status = httpError.status
          return httpError.body
        }

        set.status = 201
        return toCreditCardResponse(result.value)
      },
      {
        body: attachCreditCardRequestSchema,
        params: accountIdParamsSchema,
        response: { 201: creditCardResponseSchema, ...errorStatuses },
      },
    )
    .get(
      '/api/credit-cards/:id/available-limit',
      async ({ actorContext, params, set }) => {
        const context = requireActorContext(actorContext)
        const account = await accountLookup.findActiveById(
          context.organizationId,
          params.id as EntityId,
        )
        const result = await getAvailableLimit(
          {
            accountId: params.id as EntityId,
            currency: account?.currency ?? 'BRL',
            organizationId: context.organizationId,
          },
          creditCardRepository,
          invoiceRepository,
        )

        if (!result.ok) {
          const httpError = toHttpErrorResponse(result.error)
          set.status = httpError.status
          return httpError.body
        }

        return result.value
      },
      {
        params: accountIdParamsSchema,
        response: { 200: availableLimitResponseSchema, ...errorStatuses },
      },
    )
    .get(
      '/api/credit-cards/:id/invoices',
      async ({ actorContext, params }) => {
        const context = requireActorContext(actorContext)
        const invoices = await listInvoices(
          {
            accountId: params.id as EntityId,
            organizationId: context.organizationId,
            today: workspaceToday(),
          },
          invoiceRepository,
        )
        return invoices.map(toInvoiceResponse)
      },
      {
        params: accountIdParamsSchema,
        response: { 200: z.array(invoiceResponseSchema) },
      },
    )
    .get(
      '/api/credit-cards/:id/invoices/:invoiceId',
      async ({ actorContext, params, set }) => {
        const context = requireActorContext(actorContext)
        const result = await getInvoice(
          {
            id: params.invoiceId as EntityId,
            organizationId: context.organizationId,
            today: workspaceToday(),
          },
          invoiceRepository,
          invoiceItemLookup,
        )

        if (!result.ok) {
          const httpError = toHttpErrorResponse(result.error)
          set.status = httpError.status
          return httpError.body
        }

        return toInvoiceWithItemsResponse(result.value)
      },
      {
        params: cardInvoiceParamsSchema,
        response: { 200: invoiceWithItemsResponseSchema, ...errorStatuses },
      },
    )
    .post(
      '/api/invoices/:id/close',
      async ({ actorContext, params, set }) => {
        const context = requireActorContext(actorContext)
        const result = await closeInvoice(
          {
            id: params.id as EntityId,
            organizationId: context.organizationId,
            role: toWorkspaceRole(context.role),
          },
          invoiceRepository,
        )

        if (!result.ok) {
          const httpError = toHttpErrorResponse(result.error)
          set.status = httpError.status
          return httpError.body
        }

        return toInvoiceResponse(result.value)
      },
      {
        params: invoiceIdParamsSchema,
        response: { 200: invoiceResponseSchema, ...errorStatuses },
      },
    )
    .post(
      '/api/invoices/:id/pay',
      async ({ actorContext, body, headers, params, set }) => {
        const context = requireActorContext(actorContext)
        const idempotencyKey = headers['idempotency-key']

        if (!idempotencyKey) {
          set.status = 400
          return {
            error: { code: 'idempotency_key_required', message: 'Send an Idempotency-Key header.' },
          }
        }

        const execute = async () => {
          const result = await payInvoice(
            {
              fromAccountId: body.fromAccountId as EntityId,
              id: params.id as EntityId,
              organizationId: context.organizationId,
              role: toWorkspaceRole(context.role),
              today: workspaceToday(),
              userId: context.userId as EntityId,
            },
            invoiceRepository,
            cardAccountLookup,
            accountLookup,
            transactionRepository,
          )
          if (!result.ok) throw new DomainResultError(result.error)

          // Inside `execute`, not after `withIdempotency` resolves: a replay
          // returns the stored response without ever calling this again, so
          // the event fires exactly once per real payment (Fase 04 §
          // Modelagem names "pagar fatura" as one of the four).
          auditEvent({
            action: 'invoice.paid',
            actorId: context.userId,
            actorType: 'user',
            afterRef: result.value.transactionId,
            entityId: params.id,
            entityType: 'card_invoice',
            metadata: { fromAccountId: body.fromAccountId },
            workspaceId: context.organizationId,
          })

          return toInvoiceResponse(result.value.invoice)
        }

        try {
          const idempotent = await withIdempotency({
            execute,
            idempotencyKey,
            organizationId: context.organizationId,
            requestPayload: body,
            store: idempotencyStore,
          })

          if (!idempotent.ok) {
            const httpError = toHttpErrorResponse(idempotent.error)
            set.status = httpError.status
            return httpError.body
          }

          return idempotent.value
        } catch (error) {
          if (error instanceof DomainResultError) {
            const httpError = toHttpErrorResponse(error.domainError)
            set.status = httpError.status
            return httpError.body
          }
          throw error
        }
      },
      {
        body: payInvoiceRequestSchema,
        params: invoiceIdParamsSchema,
        response: { 200: invoiceResponseSchema, ...errorStatuses },
      },
    )
    .post(
      '/api/transactions/installments',
      async ({ actorContext, body, set }) => {
        const context = requireActorContext(actorContext)
        const result = await createInstallmentPurchase(
          {
            accountId: body.accountId as EntityId,
            categoryId: body.categoryId as EntityId,
            description: body.description,
            firstOccurredOn: body.firstOccurredOn,
            installments: body.installments,
            notes: body.notes ?? null,
            organizationId: context.organizationId,
            role: toWorkspaceRole(context.role),
            today: workspaceToday(),
            totalMinor: body.totalMinor,
            userId: context.userId as EntityId,
          },
          installmentPlanRepository,
          creditCardRepository,
          invoiceRepository,
          cardAccountLookup,
          categoryLookup,
        )

        if (!result.ok) {
          const httpError = toHttpErrorResponse(result.error)
          set.status = httpError.status
          return httpError.body
        }

        set.status = 201
        return { transactionIds: result.value }
      },
      {
        body: createInstallmentPurchaseRequestSchema,
        response: {
          201: z.object({ transactionIds: z.array(z.string()) }),
          ...errorStatuses,
        },
      },
    )
