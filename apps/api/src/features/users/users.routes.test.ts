import { describe, expect, test } from 'bun:test'
import { Elysia } from 'elysia'

import type { ActorResolution } from '../auth'
import { createUserRoutes } from './users.routes'

const user = { email: 'ana@example.com', id: 'user_1', image: null, name: ' Ana ' }

const withWorkspace: ActorResolution = {
  ok: true,
  context: {
    organizationId: 'workspace_1',
    organizationName: 'Workspace One',
    organizationSlug: 'workspace-one',
    role: 'owner',
    userId: 'user_1',
  },
}

const withoutWorkspace: ActorResolution = {
  ok: false,
  status: 403,
  code: 'no_active_workspace',
  message: 'An active workspace is required.',
}

const me = (routes: ReturnType<typeof createUserRoutes>) =>
  new Elysia().use(routes).handle(new Request('http://localhost/api/me'))

describe('GET /api/me', () => {
  test('answers 401 without a session', async () => {
    const response = await me(createUserRoutes({ resolveSession: async () => null }))

    expect(response.status).toBe(401)
    expect(await response.json()).toEqual({
      error: { code: 'unauthenticated', message: 'Authentication required.' },
    })
  })

  test('exposes the active organization and role when the actor resolves', async () => {
    const response = await me(
      createUserRoutes({
        resolveActor: async () => withWorkspace,
        resolveSession: async () => user,
      }),
    )

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({
      organization: { id: 'workspace_1', name: 'Workspace One', slug: 'workspace-one' },
      role: 'owner',
      user: { email: 'ana@example.com', id: 'user_1', image: null, name: 'Ana' },
    })
  })

  test('keeps the session usable without an active workspace', async () => {
    const response = await me(
      createUserRoutes({
        resolveActor: async () => withoutWorkspace,
        resolveSession: async () => ({ ...user, name: null }),
      }),
    )

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({
      organization: null,
      role: null,
      user: { email: 'ana@example.com', id: 'user_1', image: null, name: 'ana@example.com' },
    })
  })
})
