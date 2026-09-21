import { toWorkspaceRole } from '@fifilo/core/access-control'
import type { CategoryRepository } from '@fifilo/core/categories'
import { seedDefaultCategories } from '@fifilo/core/categories'
import type { FinancialOnboardingProgressRepository } from '@fifilo/core/onboarding'
import {
  dismissFinancialOnboarding,
  financialOnboardingStatusSchema,
  getFinancialOnboardingStatus,
  seedDefaultCategoriesResponseSchema,
} from '@fifilo/core/onboarding'
import type { WorkspaceAccountsLookup, WorkspaceSettingsRepository } from '@fifilo/core/settings'
import { getWorkspaceSettings } from '@fifilo/core/settings'
import { Elysia } from 'elysia'
import { z } from 'zod'

import { toHttpErrorResponse } from '../../libs/domain-error-status'
import { errorStatuses, mapValidationError } from '../../libs/http-errors'
import type { ActorResolver } from '../auth'
import { createAuthGuard, requireActorContext } from '../auth'
import { createCategoryRepository } from '../categories/repository'
import {
  createWorkspaceAccountsLookup,
  createWorkspaceSettingsRepository,
} from '../settings/repository'
import { createOnboardingRepository } from './repository'

export type OnboardingRouteDependencies = {
  accountsLookup?: WorkspaceAccountsLookup
  categoryRepository?: CategoryRepository
  onboardingRepository?: FinancialOnboardingProgressRepository
  resolveActor?: ActorResolver
  settingsRepository?: WorkspaceSettingsRepository
}

export const createOnboardingRoutes = ({
  accountsLookup = createWorkspaceAccountsLookup(),
  categoryRepository = createCategoryRepository(),
  onboardingRepository = createOnboardingRepository(),
  resolveActor,
  settingsRepository = createWorkspaceSettingsRepository(),
}: OnboardingRouteDependencies = {}) =>
  new Elysia({ detail: { tags: ['Onboarding'] }, prefix: '/api/onboarding' })
    .onError(mapValidationError)
    .use(createAuthGuard({ resolveActor }))
    .get(
      '/',
      async ({ actorContext }) => {
        const context = requireActorContext(actorContext)
        const settings = await getWorkspaceSettings(
          { organizationId: context.organizationId },
          settingsRepository,
        )
        const accountCreated = await accountsLookup.hasAny(context.organizationId)
        const status = await getFinancialOnboardingStatus(
          {
            accountCreated,
            organizationId: context.organizationId,
            role: toWorkspaceRole(context.role),
            settingsConfigured: settings.ok && settings.value.updatedAt !== null,
            userId: context.userId,
          },
          onboardingRepository,
        )
        return status
      },
      { response: { 200: financialOnboardingStatusSchema } },
    )
    .post(
      '/dismiss',
      async ({ actorContext, set }) => {
        const context = requireActorContext(actorContext)
        const result = await dismissFinancialOnboarding(
          {
            organizationId: context.organizationId,
            role: toWorkspaceRole(context.role),
            userId: context.userId,
          },
          onboardingRepository,
        )

        if (!result.ok) {
          const httpError = toHttpErrorResponse(result.error)
          set.status = httpError.status
          return httpError.body
        }

        set.status = 204
        return undefined
      },
      { response: { 204: z.undefined(), ...errorStatuses } },
    )
    // 200, not 201: a repeat call creates nothing, and there is no single
    // resource to point a `Location` at either way.
    .post(
      '/categories',
      async ({ actorContext, set }) => {
        const context = requireActorContext(actorContext)
        const result = await seedDefaultCategories(
          {
            organizationId: context.organizationId,
            role: toWorkspaceRole(context.role),
          },
          categoryRepository,
        )

        if (!result.ok) {
          const httpError = toHttpErrorResponse(result.error)
          set.status = httpError.status
          return httpError.body
        }

        return { seeded: result.value }
      },
      { response: { 200: seedDefaultCategoriesResponseSchema, ...errorStatuses } },
    )
