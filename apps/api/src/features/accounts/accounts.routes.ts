import type { AccountRepository, EntryReader } from '@fifilo/core/accounts'
import {
  DEFAULT_WORKSPACE_CURRENCY,
  accountBalancesResponseSchema,
  accountResponseSchema,
  archiveAccount,
  createAccount,
  createAccountRequestSchema,
  getBalances,
  listAccounts,
  listAccountsQuerySchema,
  updateAccount,
  updateAccountRequestSchema,
} from '@fifilo/core/accounts'
import type { EntityId } from '@fifilo/core/primitives'
import { Elysia } from 'elysia'
import { z } from 'zod'
import { toHttpErrorResponse } from '../../libs/domain-error-status'
import { errorStatuses, mapValidationError } from '../../libs/http-errors'
import { workspaceToday } from '../../libs/workspace-today'
import type { ActorResolver } from '../auth'
import { createAuthGuard, requireActorContext } from '../auth'
import { toAccountBalancesResponse, toAccountResponse } from './accounts.mapper'
import { createAccountRepository, createEntryReader } from './repository'

const accountIdParamsSchema = z.object({ id: z.string().min(1) })

export type AccountRouteDependencies = {
  accountRepository?: AccountRepository
  entryReader?: EntryReader
  resolveActor?: ActorResolver
}

export const createAccountRoutes = ({
  accountRepository = createAccountRepository(),
  entryReader = createEntryReader(),
  resolveActor,
}: AccountRouteDependencies = {}) =>
  new Elysia({ prefix: '/api/accounts' })
    .onError(mapValidationError)
    .use(createAuthGuard({ resolveActor }))
    .get(
      '/',
      async ({ actorContext, query }) => {
        const context = requireActorContext(actorContext)
        const accounts = await listAccounts(
          { includeArchived: query.includeArchived, organizationId: context.organizationId },
          accountRepository,
        )
        return accounts.map(toAccountResponse)
      },
      {
        query: listAccountsQuerySchema,
        response: { 200: z.array(accountResponseSchema) },
      },
    )
    .get(
      '/balances',
      async ({ actorContext, set }) => {
        const context = requireActorContext(actorContext)
        const result = await getBalances(
          { asOf: workspaceToday(), organizationId: context.organizationId },
          accountRepository,
          entryReader,
        )

        if (!result.ok) {
          const httpError = toHttpErrorResponse(result.error)
          set.status = httpError.status
          return httpError.body
        }

        return toAccountBalancesResponse(result.value)
      },
      {
        response: { 200: accountBalancesResponseSchema, ...errorStatuses },
      },
    )
    .post(
      '/',
      async ({ actorContext, body, set }) => {
        const context = requireActorContext(actorContext)
        const result = await createAccount(
          {
            color: body.color ?? null,
            currency: DEFAULT_WORKSPACE_CURRENCY,
            icon: body.icon ?? null,
            institution: body.institution ?? null,
            kind: body.kind,
            name: body.name,
            openingBalanceDate: body.openingBalanceDate ?? null,
            openingBalanceMinor: body.openingBalanceMinor ?? 0,
            organizationId: context.organizationId,
            userId: context.userId as EntityId,
          },
          accountRepository,
        )

        if (!result.ok) {
          const httpError = toHttpErrorResponse(result.error)
          set.status = httpError.status
          return httpError.body
        }

        set.status = 201
        return toAccountResponse(result.value)
      },
      {
        body: createAccountRequestSchema,
        response: { 201: accountResponseSchema, ...errorStatuses },
      },
    )
    .patch(
      '/:id',
      async ({ actorContext, body, params, set }) => {
        const context = requireActorContext(actorContext)
        const result = await updateAccount(
          {
            expectedVersion: body.version,
            id: params.id as EntityId,
            organizationId: context.organizationId,
            patch: {
              color: body.color,
              icon: body.icon,
              institution: body.institution,
              name: body.name,
            },
          },
          accountRepository,
        )

        if (!result.ok) {
          const httpError = toHttpErrorResponse(result.error)
          set.status = httpError.status
          return httpError.body
        }

        return toAccountResponse(result.value)
      },
      {
        body: updateAccountRequestSchema,
        params: accountIdParamsSchema,
        response: { 200: accountResponseSchema, ...errorStatuses },
      },
    )
    .post(
      '/:id/archive',
      async ({ actorContext, params, set }) => {
        const context = requireActorContext(actorContext)
        const result = await archiveAccount(
          { id: params.id as EntityId, organizationId: context.organizationId },
          accountRepository,
        )

        if (!result.ok) {
          const httpError = toHttpErrorResponse(result.error)
          set.status = httpError.status
          return httpError.body
        }

        return toAccountResponse(result.value)
      },
      {
        params: accountIdParamsSchema,
        response: { 200: accountResponseSchema, ...errorStatuses },
      },
    )
