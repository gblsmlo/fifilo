import { toWorkspaceRole } from '@fifilo/core/access-control'
import type { ExportReader } from '@fifilo/core/export'
import { exportTransactionsCsv, exportTransactionsQuerySchema } from '@fifilo/core/export'
import type { AuditEvent } from '@fifilo/observability/runtime'
import { auditEvent as recordAuditEvent } from '@fifilo/observability/runtime'
import { Elysia } from 'elysia'
import { z } from 'zod'

import { toHttpErrorResponse } from '../../libs/domain-error-status'
import { errorStatuses, mapValidationError } from '../../libs/http-errors'
import type { ActorResolver } from '../auth'
import { createAuthGuard, requireActorContext } from '../auth'
import { createExportReader } from './repository'

export type ExportRouteDependencies = {
  auditEvent?: (event: AuditEvent) => void
  exportReader?: ExportReader
  resolveActor?: ActorResolver
}

/**
 * Streams the CSV in the response body instead of writing it to storage
 * first (Decision 029): there is no server-side file to expire, so the 24h
 * retention `security.md` names for a generated export does not apply here -
 * nothing outlives the request.
 */
export const createExportRoutes = ({
  auditEvent = recordAuditEvent,
  exportReader = createExportReader(),
  resolveActor,
}: ExportRouteDependencies = {}) =>
  new Elysia({ prefix: '/api/export' })
    .onError(mapValidationError)
    .use(createAuthGuard({ resolveActor }))
    .get(
      '/transactions',
      async ({ actorContext, query, set }) => {
        const context = requireActorContext(actorContext)
        const result = await exportTransactionsCsv(
          {
            from: query.from,
            organizationId: context.organizationId,
            role: toWorkspaceRole(context.role),
            to: query.to,
          },
          exportReader,
        )

        if (!result.ok) {
          const httpError = toHttpErrorResponse(result.error)
          set.status = httpError.status
          return httpError.body
        }

        auditEvent({
          action: 'workspace.exported',
          actorId: context.userId,
          actorType: 'user',
          entityId: context.organizationId,
          entityType: 'workspace',
          workspaceId: context.organizationId,
        })

        set.headers['content-type'] = 'text/csv; charset=utf-8'
        set.headers['content-disposition'] =
          `attachment; filename="fifilo-${query.from}-a-${query.to}.csv"`
        return result.value
      },
      { query: exportTransactionsQuerySchema, response: { 200: z.string(), ...errorStatuses } },
    )
