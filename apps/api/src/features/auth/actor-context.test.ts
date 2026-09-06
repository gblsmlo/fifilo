import { describe, expect, test } from 'bun:test'
import { Elysia } from 'elysia'

import type { ActorResolution } from './actor'
import { createAuthGuard, requireActorContext } from './actor-context'

const validContext: ActorResolution = {
  ok: true,
  context: {
    organizationId: 'workspace_1',
    organizationName: 'Workspace One',
    organizationSlug: 'workspace-one',
    role: 'owner',
    userId: 'user_1',
  },
}

const unauthenticated: ActorResolution = {
  ok: false,
  status: 401,
  code: 'unauthenticated',
  message: 'Authentication required.',
}

const noActiveWorkspace: ActorResolution = {
  ok: false,
  status: 403,
  code: 'no_active_workspace',
  message: 'An active workspace is required.',
}

const noActiveMembership: ActorResolution = {
  ok: false,
  status: 403,
  code: 'no_active_membership',
  message: 'Active membership is required for this workspace.',
}

const createApp = (resolveActor: () => Promise<ActorResolution>) =>
  new Elysia().use(createAuthGuard({ resolveActor })).get('/whoami', ({ actorContext }) => {
    const context = requireActorContext(actorContext)
    return {
      organizationId: context.organizationId,
      role: context.role,
      userId: context.userId,
    }
  })

const request = (resolveActor: () => Promise<ActorResolution>) =>
  createApp(resolveActor).handle(new Request('http://localhost/whoami'))

describe('auth guard', () => {
  test('injects actor context and runs handler for a valid session', async () => {
    const response = await request(async () => validContext)

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({
      organizationId: 'workspace_1',
      role: 'owner',
      userId: 'user_1',
    })
  })

  test('rejects missing session with 401', async () => {
    const response = await request(async () => unauthenticated)

    expect(response.status).toBe(401)
    expect(await response.json()).toEqual({
      error: { code: 'unauthenticated', message: 'Authentication required.' },
    })
  })

  test('rejects inactive membership with 403', async () => {
    const response = await request(async () => noActiveMembership)

    expect(response.status).toBe(403)
    expect(await response.json()).toEqual({
      error: {
        code: 'no_active_membership',
        message: 'Active membership is required for this workspace.',
      },
    })
  })

  test('rejects session without active workspace with 403', async () => {
    const response = await request(async () => noActiveWorkspace)

    expect(response.status).toBe(403)
    expect(await response.json()).toEqual({
      error: {
        code: 'no_active_workspace',
        message: 'An active workspace is required.',
      },
    })
  })

  test('short-circuits before the handler runs on rejection', async () => {
    const seen: string[] = []
    const app = new Elysia()
      .use(createAuthGuard({ resolveActor: async () => unauthenticated }))
      .get('/probe', () => {
        seen.push('handler')
        return { ok: true }
      })

    const response = await app.handle(new Request('http://localhost/probe'))

    expect(response.status).toBe(401)
    expect(seen).toEqual([])
  })

  test('short-circuits before a downstream actor-context derivation runs', async () => {
    const seen: string[] = []
    const app = new Elysia()
      .use(createAuthGuard({ resolveActor: async () => unauthenticated }))
      .derive({ as: 'local' }, ({ actorContext }) => {
        seen.push('derive')
        return { workspaceId: requireActorContext(actorContext).organizationId }
      })
      .get('/probe', ({ workspaceId }) => ({ workspaceId }))

    const response = await app.handle(new Request('http://localhost/probe'))

    expect(response.status).toBe(401)
    expect(await response.json()).toEqual({
      error: { code: 'unauthenticated', message: 'Authentication required.' },
    })
    expect(seen).toEqual([])
  })

  test('does not leak the guard or a local derive into a module registered later', async () => {
    const resolverCalls: string[] = []
    const guarded = new Elysia({ prefix: '/guarded' })
      .use(
        createAuthGuard({
          resolveActor: async (request) => {
            resolverCalls.push(new URL(request.url).pathname)
            return validContext
          },
        }),
      )
      .derive({ as: 'local' }, ({ actorContext }) => ({
        workspaceId: requireActorContext(actorContext).organizationId,
      }))
      .get('/probe', ({ workspaceId }) => ({ workspaceId }))

    const open = new Elysia({ prefix: '/open' }).get('/probe', (context) => ({
      hasActorContext: 'actorContext' in context,
      hasWorkspaceId: 'workspaceId' in context,
    }))

    const app = new Elysia().use(guarded).use(open)

    const guardedResponse = await app.handle(new Request('http://localhost/guarded/probe'))
    expect(await guardedResponse.json()).toEqual({ workspaceId: 'workspace_1' })

    const openResponse = await app.handle(new Request('http://localhost/open/probe'))
    expect(openResponse.status).toBe(200)
    expect(await openResponse.json()).toEqual({ hasActorContext: false, hasWorkspaceId: false })
    expect(resolverCalls).toEqual(['/guarded/probe'])
  })

  test('fails closed when an adapter receives no authenticated actor context', () => {
    expect(() => requireActorContext(undefined)).toThrow('Authenticated actor context is required.')
  })
})
