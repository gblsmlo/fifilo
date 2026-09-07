import { toWorkspaceRole } from '@fifilo/core/access-control'
import type { EntityId } from '@fifilo/core/primitives'
import type {
  UserPreferencesRepository,
  WorkspaceAccountsLookup,
  WorkspaceSettingsRepository,
} from '@fifilo/core/settings'
import {
  getUserPreferences,
  getWorkspaceSettings,
  updateUserPreferences,
  updateUserPreferencesRequestSchema,
  updateWorkspaceSettings,
  updateWorkspaceSettingsRequestSchema,
  userPreferencesResponseSchema,
  workspaceSettingsResponseSchema,
} from '@fifilo/core/settings'
import type { AuditEvent } from '@fifilo/observability/runtime'
import { auditEvent as recordAuditEvent } from '@fifilo/observability/runtime'
import { Elysia } from 'elysia'

import { toHttpErrorResponse } from '../../libs/domain-error-status'
import { errorStatuses, mapValidationError } from '../../libs/http-errors'
import type { ActorResolver } from '../auth'
import { createAuthGuard, requireActorContext } from '../auth'
import {
  createUserPreferencesRepository,
  createWorkspaceAccountsLookup,
  createWorkspaceSettingsRepository,
} from './repository'
import { toUserPreferencesResponse, toWorkspaceSettingsResponse } from './settings.mapper'

export type SettingsRouteDependencies = {
  accountsLookup?: WorkspaceAccountsLookup
  auditEvent?: (event: AuditEvent) => void
  preferencesRepository?: UserPreferencesRepository
  resolveActor?: ActorResolver
  settingsRepository?: WorkspaceSettingsRepository
}

export const createSettingsRoutes = ({
  accountsLookup = createWorkspaceAccountsLookup(),
  auditEvent = recordAuditEvent,
  preferencesRepository = createUserPreferencesRepository(),
  resolveActor,
  settingsRepository = createWorkspaceSettingsRepository(),
}: SettingsRouteDependencies = {}) =>
  new Elysia({ detail: { tags: ['Settings'] }, prefix: '/api/settings' })
    .onError(mapValidationError)
    .use(createAuthGuard({ resolveActor }))
    .get(
      '/workspace',
      async ({ actorContext }) => {
        const context = requireActorContext(actorContext)
        const result = await getWorkspaceSettings(
          { organizationId: context.organizationId },
          settingsRepository,
        )
        // `getWorkspaceSettings` never fails (its error type is `never`);
        // this satisfies the type-level narrowing `result.value` needs.
        if (!result.ok) return result.error
        return toWorkspaceSettingsResponse(result.value)
      },
      { response: { 200: workspaceSettingsResponseSchema } },
    )
    .patch(
      '/workspace',
      async ({ actorContext, body, set }) => {
        const context = requireActorContext(actorContext)
        const result = await updateWorkspaceSettings(
          {
            expectedVersion: body.version,
            organizationId: context.organizationId,
            patch: body,
            role: toWorkspaceRole(context.role),
          },
          settingsRepository,
          accountsLookup,
        )

        if (!result.ok) {
          const httpError = toHttpErrorResponse(result.error)
          set.status = httpError.status
          return httpError.body
        }

        auditEvent({
          action: 'workspace_settings.updated',
          actorId: context.userId,
          actorType: 'user',
          entityId: context.organizationId,
          entityType: 'workspace_settings',
          workspaceId: context.organizationId,
        })

        return toWorkspaceSettingsResponse(result.value)
      },
      {
        body: updateWorkspaceSettingsRequestSchema,
        response: { 200: workspaceSettingsResponseSchema, ...errorStatuses },
      },
    )
    .get(
      '/preferences',
      async ({ actorContext }) => {
        const context = requireActorContext(actorContext)
        const result = await getUserPreferences(
          { organizationId: context.organizationId, userId: context.userId as EntityId },
          preferencesRepository,
        )
        // `getUserPreferences` never fails (its error type is `never`); this
        // satisfies the type-level narrowing `result.value` needs.
        if (!result.ok) return result.error
        return toUserPreferencesResponse(result.value)
      },
      { response: { 200: userPreferencesResponseSchema } },
    )
    .patch(
      '/preferences',
      async ({ actorContext, body, set }) => {
        const context = requireActorContext(actorContext)
        const result = await updateUserPreferences(
          {
            expectedVersion: body.version,
            organizationId: context.organizationId,
            patch: body,
            userId: context.userId as EntityId,
          },
          preferencesRepository,
        )

        if (!result.ok) {
          const httpError = toHttpErrorResponse(result.error)
          set.status = httpError.status
          return httpError.body
        }

        return toUserPreferencesResponse(result.value)
      },
      {
        body: updateUserPreferencesRequestSchema,
        response: { 200: userPreferencesResponseSchema, ...errorStatuses },
      },
    )
