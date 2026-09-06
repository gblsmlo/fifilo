import { Elysia } from 'elysia'

import type { ActorContext, ActorResolution, ActorResolver } from './actor'

export type AuthGuardOptions = {
  resolveActor?: ActorResolver
}

const defaultResolver: ActorResolver = async (request) => {
  const { resolveSessionActorContext } = await import('./actor')
  return resolveSessionActorContext(request)
}

const rejectionBody = (result: Extract<ActorResolution, { ok: false }>) => ({
  error: { code: result.code, message: result.message },
})

export const requireActorContext = (
  actorContext: ActorContext | null | undefined,
): ActorContext => {
  if (!actorContext) throw new Error('Authenticated actor context is required.')
  return actorContext
}

/**
 * Rejection raised by the guard when the request carries no usable actor.
 *
 * Thrown rather than returned as `status(...)` on purpose: a scoped `derive` or
 * `onBeforeHandle` that can return `status(...)` collapses Eden's `error` type to
 * `unknown` for every route in that scope. Throwing keeps the derive's return
 * type clean, so each route's declared `response` map stays the source of its
 * error types. The guard's `onError` turns this back into an HTTP response.
 */
export class ActorRejectionError extends Error {
  readonly status: Extract<ActorResolution, { ok: false }>['status']
  readonly body: ReturnType<typeof rejectionBody>

  constructor(resolution: Extract<ActorResolution, { ok: false }>) {
    super(resolution.message)
    this.name = 'ActorRejectionError'
    this.status = resolution.status
    this.body = rejectionBody(resolution)
  }
}

/**
 * Named `scoped` plugin: it supplies `actorContext` to the route module that
 * mounts it and to nothing registered after that module. A module that turns
 * `actorContext` into its own data must do so in a `derive({ as: 'local' })`.
 */
export const createAuthGuard = ({ resolveActor }: AuthGuardOptions = {}) =>
  new Elysia({ name: 'actor-context' })
    .onError({ as: 'scoped' }, ({ error, set }) => {
      if (error instanceof ActorRejectionError) {
        set.status = error.status
        return error.body
      }
    })
    .derive({ as: 'scoped' }, async ({ request }) => {
      const result = await (resolveActor ?? defaultResolver)(request)
      if (!result.ok) {
        throw new ActorRejectionError(result)
      }
      return { actorContext: result.context }
    })
