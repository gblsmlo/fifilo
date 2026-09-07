import { toWorkspaceRole } from '@fifilo/core/access-control'
import type { CategoryRepository } from '@fifilo/core/categories'
import {
  categoryResponseSchema,
  createCategory,
  createCategoryRequestSchema,
  listCategories,
  listCategoriesQuerySchema,
  reassignCategory,
  reassignCategoryRequestSchema,
  updateCategory,
  updateCategoryRequestSchema,
} from '@fifilo/core/categories'
import type { EntityId } from '@fifilo/core/primitives'
import type { AuditEvent } from '@fifilo/observability/runtime'
import { auditEvent as recordAuditEvent } from '@fifilo/observability/runtime'
import { Elysia } from 'elysia'
import { z } from 'zod'

import { toHttpErrorResponse } from '../../libs/domain-error-status'
import { errorStatuses, mapValidationError } from '../../libs/http-errors'
import type { ActorResolver } from '../auth'
import { createAuthGuard, requireActorContext } from '../auth'
import { toCategoryResponse } from './categories.mapper'
import { createCategoryRepository } from './repository'

const categoryIdParamsSchema = z.object({ id: z.string().min(1) })

export type CategoryRouteDependencies = {
  auditEvent?: (event: AuditEvent) => void
  categoryRepository?: CategoryRepository
  resolveActor?: ActorResolver
}

export const createCategoryRoutes = ({
  auditEvent = recordAuditEvent,
  categoryRepository = createCategoryRepository(),
  resolveActor,
}: CategoryRouteDependencies = {}) =>
  new Elysia({ detail: { tags: ['Categories'] }, prefix: '/api/categories' })
    .onError(mapValidationError)
    .use(createAuthGuard({ resolveActor }))
    .get(
      '/',
      async ({ actorContext, query }) => {
        const context = requireActorContext(actorContext)
        const result = await listCategories(
          { includeArchived: query.includeArchived, organizationId: context.organizationId },
          categoryRepository,
        )
        return result.map(toCategoryResponse)
      },
      {
        query: listCategoriesQuerySchema,
        response: { 200: z.array(categoryResponseSchema) },
      },
    )
    .post(
      '/',
      async ({ actorContext, body, set }) => {
        const context = requireActorContext(actorContext)
        const result = await createCategory(
          {
            color: body.color ?? null,
            icon: body.icon ?? null,
            kind: body.kind,
            name: body.name,
            organizationId: context.organizationId,
            parentId: (body.parentId ?? null) as EntityId | null,
            role: toWorkspaceRole(context.role),
          },
          categoryRepository,
        )

        if (!result.ok) {
          const httpError = toHttpErrorResponse(result.error)
          set.status = httpError.status
          return httpError.body
        }

        set.status = 201
        return toCategoryResponse(result.value)
      },
      {
        body: createCategoryRequestSchema,
        response: { 201: categoryResponseSchema, ...errorStatuses },
      },
    )
    .patch(
      '/:id',
      async ({ actorContext, body, params, set }) => {
        const context = requireActorContext(actorContext)
        const result = await updateCategory(
          {
            expectedVersion: body.version,
            id: params.id as EntityId,
            organizationId: context.organizationId,
            patch: { color: body.color, icon: body.icon, name: body.name },
            role: toWorkspaceRole(context.role),
          },
          categoryRepository,
        )

        if (!result.ok) {
          const httpError = toHttpErrorResponse(result.error)
          set.status = httpError.status
          return httpError.body
        }

        return toCategoryResponse(result.value)
      },
      {
        body: updateCategoryRequestSchema,
        params: categoryIdParamsSchema,
        response: { 200: categoryResponseSchema, ...errorStatuses },
      },
    )
    .post(
      '/:id/reassign',
      async ({ actorContext, body, params, set }) => {
        const context = requireActorContext(actorContext)
        const result = await reassignCategory(
          {
            id: params.id as EntityId,
            organizationId: context.organizationId,
            role: toWorkspaceRole(context.role),
            targetCategoryId: (body.targetCategoryId ?? null) as EntityId | null,
          },
          categoryRepository,
        )

        if (!result.ok) {
          const httpError = toHttpErrorResponse(result.error)
          set.status = httpError.status
          return httpError.body
        }

        // Only the bulk move gets an event, not a plain archive with nothing
        // pointing at it (Fase 04 § Modelagem: "reatribuir categoria em
        // massa") - a target present in the request is exactly the signal
        // `reassignCategory` itself uses to tell the two paths apart.
        if (body.targetCategoryId) {
          auditEvent({
            action: 'category.reassigned',
            actorId: context.userId,
            actorType: 'user',
            afterRef: body.targetCategoryId,
            beforeRef: params.id,
            entityId: result.value.id,
            entityType: 'category',
            workspaceId: context.organizationId,
          })
        }

        return toCategoryResponse(result.value)
      },
      {
        body: reassignCategoryRequestSchema,
        params: categoryIdParamsSchema,
        response: { 200: categoryResponseSchema, ...errorStatuses },
      },
    )
