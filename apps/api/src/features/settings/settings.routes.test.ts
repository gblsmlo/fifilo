import { describe, expect, test } from 'bun:test'
import type { WorkspaceRole } from '@fifilo/core/access-control'
import { Elysia } from 'elysia'

import type { ActorResolution } from '../auth'
import { createSettingsRoutes } from './settings.routes'
import {
  createFakeUserPreferencesRepository,
  createFakeWorkspaceAccountsLookup,
  createFakeWorkspaceSettingsRepository,
} from './settings-test-support'

const ORG_A = 'org_a'

const actorWith = (role: WorkspaceRole): ActorResolution => ({
  ok: true,
  context: {
    organizationId: ORG_A,
    organizationName: 'Org A',
    organizationSlug: 'org-a',
    role,
    userId: 'user_1',
  },
})

const request = (
  routes: ReturnType<typeof createSettingsRoutes>,
  path: string,
  init?: RequestInit,
) => new Elysia().use(routes).handle(new Request(`http://localhost${path}`, init))

const patchInit = (body: unknown) => ({
  body: JSON.stringify(body),
  headers: { 'content-type': 'application/json' },
  method: 'PATCH',
})

describe('settings routes', () => {
  test('GET /workspace lazily materializes the default settings for a new organization', async () => {
    const routes = createSettingsRoutes({
      resolveActor: async () => actorWith('viewer'),
      settingsRepository: createFakeWorkspaceSettingsRepository(),
    })

    const response = await request(routes, '/api/settings/workspace')

    expect(response.status).toBe(200)
    expect(await response.json()).toMatchObject({
      currency: 'BRL',
      organizationId: ORG_A,
      version: 0,
    })
  })

  test('PATCH /workspace lets an owner change settings', async () => {
    const routes = createSettingsRoutes({
      resolveActor: async () => actorWith('owner'),
      settingsRepository: createFakeWorkspaceSettingsRepository(),
    })

    const response = await request(
      routes,
      '/api/settings/workspace',
      patchInit({ timezone: 'America/Bahia', version: 0 }),
    )

    expect(response.status).toBe(200)
    expect(await response.json()).toMatchObject({ timezone: 'America/Bahia', version: 1 })
  })

  test('PATCH /workspace lets an admin change settings', async () => {
    const routes = createSettingsRoutes({
      resolveActor: async () => actorWith('admin'),
      settingsRepository: createFakeWorkspaceSettingsRepository(),
    })

    const response = await request(
      routes,
      '/api/settings/workspace',
      patchInit({ timezone: 'America/Bahia', version: 0 }),
    )

    expect(response.status).toBe(200)
  })

  test('PATCH /workspace denies a member', async () => {
    const routes = createSettingsRoutes({
      resolveActor: async () => actorWith('member'),
      settingsRepository: createFakeWorkspaceSettingsRepository(),
    })

    const response = await request(
      routes,
      '/api/settings/workspace',
      patchInit({ timezone: 'America/Bahia', version: 0 }),
    )

    expect(response.status).toBe(403)
  })

  test('PATCH /workspace denies a viewer', async () => {
    const routes = createSettingsRoutes({
      resolveActor: async () => actorWith('viewer'),
      settingsRepository: createFakeWorkspaceSettingsRepository(),
    })

    const response = await request(
      routes,
      '/api/settings/workspace',
      patchInit({ timezone: 'America/Bahia', version: 0 }),
    )

    expect(response.status).toBe(403)
  })

  test('PATCH /workspace refuses a currency change once the workspace has an account', async () => {
    const routes = createSettingsRoutes({
      accountsLookup: createFakeWorkspaceAccountsLookup(true),
      resolveActor: async () => actorWith('owner'),
      settingsRepository: createFakeWorkspaceSettingsRepository(),
    })

    const response = await request(
      routes,
      '/api/settings/workspace',
      patchInit({ currency: 'USD', version: 0 }),
    )

    expect(response.status).toBe(409)
    const body = (await response.json()) as { error: { code: string } }
    expect(body.error.code).toBe('currency_locked')
  })

  test('PATCH /workspace reports a stale version as a conflict', async () => {
    const routes = createSettingsRoutes({
      resolveActor: async () => actorWith('owner'),
      settingsRepository: createFakeWorkspaceSettingsRepository(),
    })

    const response = await request(
      routes,
      '/api/settings/workspace',
      patchInit({ timezone: 'America/Bahia', version: 3 }),
    )

    expect(response.status).toBe(409)
    const body = (await response.json()) as { error: { code: string } }
    expect(body.error.code).toBe('version_conflict')
  })

  test('PATCH /workspace rejects an out-of-range monthStartDay', async () => {
    const routes = createSettingsRoutes({
      resolveActor: async () => actorWith('owner'),
      settingsRepository: createFakeWorkspaceSettingsRepository(),
    })

    const response = await request(
      routes,
      '/api/settings/workspace',
      patchInit({ monthStartDay: 29, version: 0 }),
    )

    expect(response.status).toBe(400)
  })

  test('GET /preferences lazily materializes the default preferences for the actor', async () => {
    const routes = createSettingsRoutes({
      preferencesRepository: createFakeUserPreferencesRepository(),
      resolveActor: async () => actorWith('viewer'),
    })

    const response = await request(routes, '/api/settings/preferences')

    expect(response.status).toBe(200)
    expect(await response.json()).toMatchObject({ theme: 'system', userId: 'user_1', version: 0 })
  })

  test('PATCH /preferences lets any role change their own preferences', async () => {
    const routes = createSettingsRoutes({
      preferencesRepository: createFakeUserPreferencesRepository(),
      resolveActor: async () => actorWith('viewer'),
    })

    const response = await request(
      routes,
      '/api/settings/preferences',
      patchInit({ theme: 'dark', version: 0 }),
    )

    expect(response.status).toBe(200)
    expect(await response.json()).toMatchObject({ theme: 'dark', version: 1 })
  })

  test('an unauthenticated request is rejected before reaching the repository', async () => {
    const routes = createSettingsRoutes({
      resolveActor: async () => ({
        ok: false,
        status: 401,
        code: 'unauthenticated',
        message: 'Authentication required.',
      }),
      settingsRepository: createFakeWorkspaceSettingsRepository(),
    })

    const response = await request(routes, '/api/settings/workspace')

    expect(response.status).toBe(401)
  })
})
