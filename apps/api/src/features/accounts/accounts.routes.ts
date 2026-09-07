import { toWorkspaceRole } from '@fifilo/core/access-control'
import type { AccountRepository, EntryReader } from '@fifilo/core/accounts'
import {
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
import type { WorkspaceSettingsRepository } from '@fifilo/core/settings'
import { getWorkspaceSettings } from '@fifilo/core/settings'
import type { AuditEvent } from '@fifilo/observability/runtime'
import { auditEvent as recordAuditEvent } from '@fifilo/observability/runtime'
import { Elysia } from 'elysia'
import { z } from 'zod'
import { toHttpErrorResponse } from '../../libs/domain-error-status'
import { errorStatuses, mapValidationError } from '../../libs/http-errors'
import { workspaceToday } from '../../libs/workspace-today'
import type { ActorResolver } from '../auth'
import { createAuthGuard, requireActorContext } from '../auth'
import { createWorkspaceSettingsRepository } from '../settings/repository'
import { toAccountBalancesResponse, toAccountResponse } from './accounts.mapper'
import { createAccountRepository, createEntryReader } from './repository'

const accountIdParamsSchema = z.object({ id: z.string().min(1) })

export type AccountRouteDependencies = {
  accountRepository?: AccountRepository
  auditEvent?: (event: AuditEvent) => void
  entryReader?: EntryReader
  resolveActor?: ActorResolver
  settingsRepository?: WorkspaceSettingsRepository
}

export const createAccountRoutes = ({
  accountRepository = createAccountRepository(),
  auditEvent = recordAuditEvent,
  entryReader = createEntryReader(),
  resolveActor,
  settingsRepository = createWorkspaceSettingsRepository(),
}: AccountRouteDependencies = {}) =>
  new Elysia({ detail: { tags: ['Accounts'] }, prefix: '/api/accounts' })
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
        // `getWorkspaceSettings` never fails (Result<T, never>); the workspace's
        // own timezone resolves "today" before any read runs (Decision 018).
        const settings = await getWorkspaceSettings(
          { organizationId: context.organizationId },
          settingsRepository,
        )
        if (!settings.ok) return settings.error

        const result = await getBalances(
          {
            asOf: workspaceToday(new Date(), settings.value.timezone),
            organizationId: context.organizationId,
            workspaceCurrency: settings.value.currency,
          },
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
        // A workspace that never opened Settings still resolves a currency
        // (Fase 06 § Modelagem) - `getWorkspaceSettings` never fails.
        const settings = await getWorkspaceSettings(
          { organizationId: context.organizationId },
          settingsRepository,
        )
        if (!settings.ok) return settings.error

        const result = await createAccount(
          {
            color: body.color ?? null,
            currency: settings.value.currency,
            icon: body.icon ?? null,
            institution: body.institution ?? null,
            kind: body.kind,
            name: body.name,
            openingBalanceDate: body.openingBalanceDate ?? null,
            openingBalanceMinor: body.openingBalanceMinor ?? 0,
            organizationId: context.organizationId,
            role: toWorkspaceRole(context.role),
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
            role: toWorkspaceRole(context.role),
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
          {
            id: params.id as EntityId,
            organizationId: context.organizationId,
            role: toWorkspaceRole(context.role),
          },
          accountRepository,
        )

        if (!result.ok) {
          const httpError = toHttpErrorResponse(result.error)
          set.status = httpError.status
          return httpError.body
        }

        // Archiving keeps every entry the account already has (Fase 01 §
        // Modelagem) - the audit trail is what lets someone reconstruct
        // whose history just went read-only and when (Fase 04 § Modelagem).
        auditEvent({
          action: 'account.archived',
          actorId: context.userId,
          actorType: 'user',
          entityId: result.value.id,
          entityType: 'financial_account',
          workspaceId: context.organizationId,
        })

        return toAccountResponse(result.value)
      },
      {
        params: accountIdParamsSchema,
        response: { 200: accountResponseSchema, ...errorStatuses },
      },
    )
