import { healthResponseSchema } from '@fifilo/core/contracts/health'
import { traceHttpRequest } from '@fifilo/observability/runtime'
import { Elysia } from 'elysia'

import { createAuthHandlerRoutes, createAuthRoutes } from './features/auth'
import { createHealthResponse } from './features/health'
import { createUserRoutes } from './features/users'
import { mapValidationError } from './libs/http-errors'

/**
 * API composition, kept apart from `server.ts` because the mounting is what
 * needs to be exercisable: `app.handle()` over the whole app catches plugin
 * interaction defects no isolated route reveals.
 */
export const createApp = () =>
  new Elysia()
    .onError(({ code, set }) => mapValidationError({ code, set }))
    .get('/health', ({ request }) => traceHttpRequest(request, () => createHealthResponse()), {
      response: { 200: healthResponseSchema },
    })
    .use(createAuthHandlerRoutes())
    .use(createAuthRoutes())
    .use(createUserRoutes())

export type App = ReturnType<typeof createApp>
