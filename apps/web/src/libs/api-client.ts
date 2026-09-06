import { treaty } from '@elysia/eden'
import type { App } from '@fifilo/api/server'
// Through the alias, not a relative path: `@libs/api-fetch` is the module the
// Storybook swaps for a browser stub. A relative import bypasses that swap and
// drags `@tanstack/react-start` into every story that reaches this module.
import { cookieAwareFetch } from '@libs/api-fetch'

/**
 * Eden builds the URL by concatenation and hands the finished string to the
 * `fetcher`. The base is fixed when the treaty is constructed, at module load,
 * which is too early to consult the environment. So the base here is a sentinel
 * and `cookieAwareFetch` resolves the real destination on every call, the same
 * place that already forwards the SSR session cookie.
 */
const BASE_SENTINEL = 'http://eden.invalid'

const toPath = (input: RequestInfo | URL): string => {
  const value = input instanceof URL ? input.toString() : String(input)
  return value.startsWith(BASE_SENTINEL) ? value.slice(BASE_SENTINEL.length) : value
}

/**
 * The `/api` node of the treaty, not the root: every Elysia route carries the
 * prefix, and without this the consumer would repeat the segment. The prefix
 * stays on the server because Web and API share an origin and it is how the
 * browser tells API from SPA route. `/health` is the only route outside it and
 * no web code consumes it.
 */
export const api = treaty<App>(BASE_SENTINEL, {
  parseDate: false,
  headers: { accept: 'application/json' },
  // `typeof fetch` includes `preconnect` (React augmentation); only the call signature matters.
  fetcher: ((input: RequestInfo | URL, init?: RequestInit) =>
    cookieAwareFetch(toPath(input), init)) as typeof fetch,
}).api

/**
 * HTTP status of an Eden error, as a number.
 *
 * Eden types the statuses declared in a route's `response` map as string
 * literals (`"403"`) while producing numbers at runtime (`403`). Writing
 * `error.status === '403'` compiles and never matches; route the comparison
 * through here instead.
 */
export const edenStatus = (error: { status: unknown }): number => Number(error.status)

/**
 * Normalizes the result of every route whose success status is not `200`.
 *
 * Eden extracts `data` from the `200` slot. On a route that declares only `201`
 * or `204`, Elysia leaves in that slot the handler's inferred union, error
 * envelope included, so `if (error)` covers the failure path but does not
 * narrow `data`. On `204` the runtime delivers an empty string where the type
 * promises `undefined`. Routes that declare `200` do not go through here:
 * wrapping everything would hide which routes have the problem.
 */
export const edenCreated = <T>(result: {
  data: T | { error: { code: string; message: string } } | null
  error: { status: unknown; value: unknown } | null
  status: number
}): { data: T; error: null } | { data: null; error: { status: unknown; value: unknown } } => {
  if (result.error) return { data: null, error: result.error }
  if (result.data && typeof result.data === 'object' && 'error' in result.data) {
    return { data: null, error: { status: result.status, value: result.data } }
  }
  return { data: result.data as T, error: null }
}
