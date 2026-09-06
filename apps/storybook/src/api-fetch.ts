/**
 * Browser stub for `@libs/api-fetch`. The real module reads the SSR session
 * through `@tanstack/react-start`, which builds an `AsyncLocalStorage` from
 * `node:async_hooks`: absent in the browser where stories run.
 *
 * It must mirror every export of the real module: a missing export does not
 * fail the build, it fails the story that reaches it.
 */
export const apiFetch = (path: string, init: RequestInit = {}) =>
  fetch(path, { ...init, credentials: init.credentials ?? 'include' })

export const cookieAwareFetch = (input: RequestInfo | URL, init: RequestInit = {}) =>
  fetch(input, { ...init, credentials: init.credentials ?? 'include' })
