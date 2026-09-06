import { auth } from '@twincam/auth/server'
import { traceHttpRequest } from '@twincam/observability/runtime'
import { Elysia } from 'elysia'

/**
 * Mounts the Better Auth handler under `/api/auth/*`.
 *
 * `parse: 'none'` is not an optimization: Better Auth reads the body from the
 * `Request` itself, and Elysia's body parser, enabled by other route modules in
 * the composed app, would consume the stream first and break every sign-in and
 * sign-up with `ERR_BODY_ALREADY_USED`. It lives in a factory rather than loose
 * in `server.ts` so the mounting is exercisable through `app.handle()`.
 */
export const createAuthHandlerRoutes = () =>
  new Elysia().all(
    '/api/auth/*',
    ({ request }) => traceHttpRequest(request, () => auth.handler(request)),
    { parse: 'none' },
  )
