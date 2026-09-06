import { healthResponseSchema } from '@fifilo/core/contracts/health'
import { traceHttpRequest } from '@fifilo/observability/runtime'
import { Elysia } from 'elysia'

import type { AccountRouteDependencies } from './features/accounts'
import { createAccountRoutes } from './features/accounts'
import type { AnalyticsRouteDependencies } from './features/analytics'
import { createAnalyticsRoutes } from './features/analytics'
import { createAuthHandlerRoutes, createAuthRoutes } from './features/auth'
import type { CategoryRouteDependencies } from './features/categories'
import { createCategoryRoutes } from './features/categories'
import type { CreditCardRouteDependencies } from './features/credit-cards'
import { createCreditCardRoutes } from './features/credit-cards'
import { createHealthResponse } from './features/health'
import type { TransactionRouteDependencies } from './features/transactions'
import { createTransactionRoutes } from './features/transactions'
import { createUserRoutes } from './features/users'
import { mapValidationError } from './libs/http-errors'

/**
 * Per-feature overrides, threaded through instead of each feature reaching
 * for its own real, DB-backed default (Decision 003). Production never
 * passes any of this; the access-control sweep
 * (`access-control-sweep.test.ts`) is the one caller that does, so the exact
 * same composition `server.ts` boots is what the sweep exercises with fakes.
 */
export type CreateAppDependencies = {
  accounts?: AccountRouteDependencies
  analytics?: AnalyticsRouteDependencies
  categories?: CategoryRouteDependencies
  creditCards?: CreditCardRouteDependencies
  transactions?: TransactionRouteDependencies
}

/**
 * API composition, kept apart from `server.ts` because the mounting is what
 * needs to be exercisable: `app.handle()` over the whole app catches plugin
 * interaction defects no isolated route reveals.
 */
export const createApp = (dependencies: CreateAppDependencies = {}) =>
  new Elysia()
    .onError(({ code, set }) => mapValidationError({ code, set }))
    .get('/health', ({ request }) => traceHttpRequest(request, () => createHealthResponse()), {
      response: { 200: healthResponseSchema },
    })
    .use(createAuthHandlerRoutes())
    .use(createAuthRoutes())
    .use(createUserRoutes())
    .use(createAccountRoutes(dependencies.accounts))
    .use(createCategoryRoutes(dependencies.categories))
    .use(createTransactionRoutes(dependencies.transactions))
    .use(createCreditCardRoutes(dependencies.creditCards))
    .use(createAnalyticsRoutes(dependencies.analytics))

export type App = ReturnType<typeof createApp>
