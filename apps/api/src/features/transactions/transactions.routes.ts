import { toWorkspaceRole } from '@fifilo/core/access-control'
import type { EntityId } from '@fifilo/core/primitives'
import type {
  AccountLookup,
  CategoryLookup,
  CreateTransactionCommand,
  CreateTransactionRequest,
  TransactionRepository,
  UpdateTransactionCommand,
  UpdateTransactionRequest,
} from '@fifilo/core/transactions'
import {
  createTransaction,
  createTransactionRequestSchema,
  deleteTransaction,
  listTransactions,
  listTransactionsQuerySchema,
  transactionResponseSchema,
  transactionsPageResponseSchema,
  updateTransaction,
  updateTransactionRequestSchema,
} from '@fifilo/core/transactions'
import { Elysia } from 'elysia'
import { z } from 'zod'

import { toHttpErrorResponse } from '../../libs/domain-error-status'
import { errorStatuses, mapValidationError } from '../../libs/http-errors'
import type { IdempotencyStore } from '../../libs/idempotency'
import { withIdempotency } from '../../libs/idempotency'
import { createDrizzleIdempotencyStore } from '../../libs/idempotency-persistence'
import type { ActorContext, ActorResolver } from '../auth'
import { createAuthGuard, requireActorContext } from '../auth'
import {
  createAccountLookup,
  createCategoryLookup,
  createTransactionRepository,
} from './repository'
import { toTransactionResponse } from './transactions.mapper'

const transactionIdParamsSchema = z.object({ id: z.string().min(1) })

/**
 * A domain `Result` error carried through `withIdempotency`'s `execute`,
 * which only ever returns a success value or throws (Fase 00 § idempotency).
 * Unwrapped right after, in the same route.
 */
class DomainResultError<E> extends Error {
  constructor(readonly domainError: E) {
    super('domain result error')
    this.name = 'DomainResultError'
  }
}

const encodeCursor = (cursor: { id: string; occurredOn: string }): string =>
  Buffer.from(JSON.stringify(cursor)).toString('base64url')

const decodeCursor = (value: string): { id: EntityId; occurredOn: string } | undefined => {
  try {
    const decoded = JSON.parse(Buffer.from(value, 'base64url').toString('utf8')) as {
      id?: unknown
      occurredOn?: unknown
    }
    if (typeof decoded.id !== 'string' || typeof decoded.occurredOn !== 'string') return undefined
    return { id: decoded.id as EntityId, occurredOn: decoded.occurredOn }
  } catch {
    return undefined
  }
}

const buildCreateCommand = (
  body: CreateTransactionRequest,
  context: ActorContext,
): CreateTransactionCommand =>
  body.kind === 'transfer'
    ? {
        amountMinor: body.amountMinor,
        description: body.description,
        fromAccountId: body.fromAccountId as EntityId,
        kind: 'transfer',
        notes: body.notes ?? null,
        occurredOn: body.occurredOn,
        organizationId: context.organizationId,
        role: toWorkspaceRole(context.role),
        toAccountId: body.toAccountId as EntityId,
        userId: context.userId as EntityId,
      }
    : {
        accountId: body.accountId as EntityId,
        amountMinor: body.amountMinor,
        categoryId: body.categoryId as EntityId,
        description: body.description,
        kind: body.kind,
        notes: body.notes ?? null,
        occurredOn: body.occurredOn,
        organizationId: context.organizationId,
        role: toWorkspaceRole(context.role),
        userId: context.userId as EntityId,
      }

const buildUpdateCommand = (
  body: UpdateTransactionRequest,
  id: EntityId,
  context: ActorContext,
): UpdateTransactionCommand =>
  body.kind === 'transfer'
    ? {
        amountMinor: body.amountMinor,
        description: body.description,
        expectedVersion: body.version,
        fromAccountId: body.fromAccountId as EntityId,
        id,
        kind: 'transfer',
        notes: body.notes ?? null,
        occurredOn: body.occurredOn,
        organizationId: context.organizationId,
        role: toWorkspaceRole(context.role),
        toAccountId: body.toAccountId as EntityId,
      }
    : {
        accountId: body.accountId as EntityId,
        amountMinor: body.amountMinor,
        categoryId: body.categoryId as EntityId,
        description: body.description,
        expectedVersion: body.version,
        id,
        kind: body.kind,
        notes: body.notes ?? null,
        occurredOn: body.occurredOn,
        organizationId: context.organizationId,
        role: toWorkspaceRole(context.role),
      }

export type TransactionRouteDependencies = {
  accountLookup?: AccountLookup
  categoryLookup?: CategoryLookup
  idempotencyStore?: IdempotencyStore
  resolveActor?: ActorResolver
  transactionRepository?: TransactionRepository
}

export const createTransactionRoutes = ({
  accountLookup = createAccountLookup(),
  categoryLookup = createCategoryLookup(),
  idempotencyStore = createDrizzleIdempotencyStore(),
  resolveActor,
  transactionRepository = createTransactionRepository(),
}: TransactionRouteDependencies = {}) =>
  new Elysia({ prefix: '/api/transactions' })
    .onError(mapValidationError)
    .use(createAuthGuard({ resolveActor }))
    .get(
      '/',
      async ({ actorContext, query }) => {
        const context = requireActorContext(actorContext)

        const page = await listTransactions(
          {
            accountId: query.accountId as EntityId | undefined,
            categoryId: query.categoryId as EntityId | undefined,
            cursor: query.cursor ? decodeCursor(query.cursor) : undefined,
            from: query.from,
            kind: query.kind,
            limit: query.limit,
            organizationId: context.organizationId,
            q: query.q,
            to: query.to,
          },
          transactionRepository,
        )

        return {
          items: page.items.map(toTransactionResponse),
          nextCursor: page.nextCursor ? encodeCursor(page.nextCursor) : null,
        }
      },
      {
        query: listTransactionsQuerySchema,
        response: { 200: transactionsPageResponseSchema },
      },
    )
    .post(
      '/',
      async ({ actorContext, body, headers, set }) => {
        const context = requireActorContext(actorContext)
        const idempotencyKey = headers['idempotency-key']

        const execute = async () => {
          const result = await createTransaction(
            buildCreateCommand(body, context),
            transactionRepository,
            accountLookup,
            categoryLookup,
          )
          if (!result.ok) throw new DomainResultError(result.error)
          return toTransactionResponse(result.value)
        }

        try {
          if (idempotencyKey) {
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

            set.status = 201
            return idempotent.value
          }

          const response = await execute()
          set.status = 201
          return response
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
        body: createTransactionRequestSchema,
        response: { 201: transactionResponseSchema, ...errorStatuses },
      },
    )
    .patch(
      '/:id',
      async ({ actorContext, body, params, set }) => {
        const context = requireActorContext(actorContext)
        const result = await updateTransaction(
          buildUpdateCommand(body, params.id as EntityId, context),
          transactionRepository,
          accountLookup,
          categoryLookup,
        )

        if (!result.ok) {
          const httpError = toHttpErrorResponse(result.error)
          set.status = httpError.status
          return httpError.body
        }

        return toTransactionResponse(result.value)
      },
      {
        body: updateTransactionRequestSchema,
        params: transactionIdParamsSchema,
        response: { 200: transactionResponseSchema, ...errorStatuses },
      },
    )
    .delete(
      '/:id',
      async ({ actorContext, params, set }) => {
        const context = requireActorContext(actorContext)
        const result = await deleteTransaction(
          {
            id: params.id as EntityId,
            organizationId: context.organizationId,
            role: toWorkspaceRole(context.role),
          },
          transactionRepository,
        )

        if (!result.ok) {
          const httpError = toHttpErrorResponse(result.error)
          set.status = httpError.status
          return httpError.body
        }

        return { success: true as const }
      },
      {
        params: transactionIdParamsSchema,
        response: { 200: z.object({ success: z.literal(true) }), ...errorStatuses },
      },
    )
