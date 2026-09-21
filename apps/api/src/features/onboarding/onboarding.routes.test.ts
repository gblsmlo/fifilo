import { describe, expect, test } from 'bun:test'
import type { WorkspaceRole } from '@fifilo/core/access-control'
import { DEFAULT_CATEGORIES } from '@fifilo/core/categories'
import type {
  FinancialOnboardingProgress,
  FinancialOnboardingProgressRepository,
} from '@fifilo/core/onboarding'
import type { WorkspaceSettingsRepository } from '@fifilo/core/settings'
import { Elysia } from 'elysia'

import type { ActorResolution } from '../auth'
import { createFakeCategoryRepository } from '../categories/categories-test-support'
import { createOnboardingRoutes } from './onboarding.routes'

const actorWith = (role: WorkspaceRole): ActorResolution => ({
  ok: true,
  context: {
    organizationId: 'org_1',
    organizationName: 'Org 1',
    organizationSlug: 'org-1',
    role,
    userId: 'user_1',
  },
})

const progress = (
  row: FinancialOnboardingProgress | null = {
    dismissedAt: null,
    organizationId: 'org_1',
    userId: 'user_1',
  },
): FinancialOnboardingProgressRepository & { dismissed: number } => {
  let current = row
  let dismissed = 0
  return {
    get dismissed() {
      return dismissed
    },
    async findByUser() {
      return current
    },
    async dismiss() {
      dismissed += 1
      if (current) current = { ...current, dismissedAt: new Date() }
    },
  }
}

const settings = (configured: boolean): WorkspaceSettingsRepository => ({
  async findByOrganizationId() {
    return configured
      ? {
          currency: 'BRL',
          locale: 'pt-BR',
          monthStartDay: 1,
          organizationId: 'org_1',
          timezone: 'America/Sao_Paulo',
          updatedAt: new Date(),
          version: 1,
          weekStartsOn: 'monday',
        }
      : null
  },
  async upsert() {
    throw new Error('not used')
  },
})

const request = (
  routes: ReturnType<typeof createOnboardingRoutes>,
  path: string,
  init?: RequestInit,
) => new Elysia().use(routes).handle(new Request(`http://localhost${path}`, init))

describe('onboarding routes', () => {
  test('returns readiness for the scoped owner', async () => {
    const routes = createOnboardingRoutes({
      accountsLookup: {
        async hasAny() {
          return false
        },
      },
      onboardingRepository: progress(),
      resolveActor: async () => actorWith('owner'),
      settingsRepository: settings(false),
    })

    const response = await request(routes, '/api/onboarding')

    expect(response.status).toBe(200)
    expect(await response.json()).toMatchObject({ eligible: true, complete: false })
  })

  test('returns 204 and records dismissal', async () => {
    const repository = progress()
    const routes = createOnboardingRoutes({
      onboardingRepository: repository,
      resolveActor: async () => actorWith('owner'),
      accountsLookup: {
        async hasAny() {
          return false
        },
      },
      settingsRepository: settings(false),
    })

    const response = await request(routes, '/api/onboarding/dismiss', { method: 'POST' })

    expect(response.status).toBe(204)
    expect(repository.dismissed).toBe(1)
  })

  test('denies non-owner dismissal', async () => {
    const repository = progress()
    const routes = createOnboardingRoutes({
      onboardingRepository: repository,
      resolveActor: async () => actorWith('member'),
      accountsLookup: {
        async hasAny() {
          return false
        },
      },
      settingsRepository: settings(false),
    })

    const response = await request(routes, '/api/onboarding/dismiss', { method: 'POST' })

    expect(response.status).toBe(403)
    expect(repository.dismissed).toBe(0)
  })

  test('rejects unauthenticated access before the repository', async () => {
    const repository = progress()
    const routes = createOnboardingRoutes({
      onboardingRepository: repository,
      resolveActor: async () => ({
        ok: false,
        status: 401,
        code: 'unauthenticated',
        message: 'Authentication required.',
      }),
      accountsLookup: {
        async hasAny() {
          return false
        },
      },
      settingsRepository: settings(false),
    })

    const response = await request(routes, '/api/onboarding')

    expect(response.status).toBe(401)
    expect(repository.dismissed).toBe(0)
  })

  test('does not expose another user progress row', async () => {
    const repository: FinancialOnboardingProgressRepository = {
      async findByUser(_organizationId, userId) {
        return userId === 'user_1' ? null : progress().findByUser('org_1', 'user_2')
      },
      async dismiss() {},
    }
    const routes = createOnboardingRoutes({
      onboardingRepository: repository,
      resolveActor: async () => actorWith('owner'),
      accountsLookup: {
        async hasAny() {
          return false
        },
      },
      settingsRepository: settings(false),
    })

    const response = await request(routes, '/api/onboarding')

    expect(response.status).toBe(200)
    expect(await response.json()).toMatchObject({ eligible: false, dismissed: false })
  })

  test('seeds the default categories once and reports how many it wrote', async () => {
    const repository = createFakeCategoryRepository()
    const routes = createOnboardingRoutes({
      accountsLookup: {
        async hasAny() {
          return false
        },
      },
      categoryRepository: repository,
      onboardingRepository: progress(),
      resolveActor: async () => actorWith('owner'),
      settingsRepository: settings(false),
    })

    const first = await request(routes, '/api/onboarding/categories', { method: 'POST' })
    expect(first.status).toBe(200)
    expect(await first.json()).toEqual({ seeded: DEFAULT_CATEGORIES.length })

    const second = await request(routes, '/api/onboarding/categories', { method: 'POST' })
    expect(second.status).toBe(200)
    expect(await second.json()).toEqual({ seeded: 0 })
    expect(await repository.list('org_1', { includeArchived: true })).toHaveLength(
      DEFAULT_CATEGORIES.length,
    )
  })

  test('denies seeding to a role that is not the workspace owner', async () => {
    const repository = createFakeCategoryRepository()
    const routes = createOnboardingRoutes({
      accountsLookup: {
        async hasAny() {
          return false
        },
      },
      categoryRepository: repository,
      onboardingRepository: progress(),
      resolveActor: async () => actorWith('admin'),
      settingsRepository: settings(false),
    })

    const response = await request(routes, '/api/onboarding/categories', { method: 'POST' })

    expect(response.status).toBe(403)
    expect(await repository.list('org_1', { includeArchived: true })).toHaveLength(0)
  })
})
