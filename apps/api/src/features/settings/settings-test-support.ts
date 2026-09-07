import type { EntityId } from '@fifilo/core/primitives'
import type {
  UpsertOutcome,
  UserPreferences,
  UserPreferencesRepository,
  WorkspaceAccountsLookup,
  WorkspaceSettings,
  WorkspaceSettingsRepository,
} from '@fifilo/core/settings'

/**
 * An in-memory stand-in for the Drizzle adapters, local to this feature's
 * route tests - not a deep import of Core's own test-only fixture, mirroring
 * `analytics-test-support.ts`'s own note.
 */
export const createFakeWorkspaceSettingsRepository = (
  seed: Map<string, WorkspaceSettings> = new Map(),
): WorkspaceSettingsRepository => ({
  async findByOrganizationId(organizationId) {
    return seed.get(organizationId) ?? null
  },
  async upsert(organizationId, patch, expectedVersion): Promise<UpsertOutcome<WorkspaceSettings>> {
    const existing = seed.get(organizationId) ?? null

    if (expectedVersion === 0) {
      if (existing) return 'version_conflict'
      const created: WorkspaceSettings = {
        currency: patch.currency ?? 'BRL',
        locale: patch.locale ?? 'pt-BR',
        monthStartDay: patch.monthStartDay ?? 1,
        organizationId,
        timezone: patch.timezone ?? 'America/Sao_Paulo',
        updatedAt: new Date(),
        version: 1,
        weekStartsOn: patch.weekStartsOn ?? 'monday',
      }
      seed.set(organizationId, created)
      return created
    }

    if (!existing || existing.version !== expectedVersion) return 'version_conflict'
    const updated: WorkspaceSettings = {
      ...existing,
      ...patch,
      updatedAt: new Date(),
      version: existing.version + 1,
    }
    seed.set(organizationId, updated)
    return updated
  },
})

export const createFakeUserPreferencesRepository = (
  seed: Map<string, UserPreferences> = new Map(),
): UserPreferencesRepository => ({
  async findByUser(organizationId, userId) {
    return seed.get(`${organizationId}:${userId}`) ?? null
  },
  async upsert(
    organizationId,
    userId,
    patch,
    expectedVersion,
  ): Promise<UpsertOutcome<UserPreferences>> {
    const key = `${organizationId}:${userId}`
    const existing = seed.get(key) ?? null

    if (expectedVersion === 0) {
      if (existing) return 'version_conflict'
      const created: UserPreferences = {
        density: patch.density ?? 'comfortable',
        notifyByEmail: patch.notifyByEmail ?? true,
        organizationId,
        theme: patch.theme ?? 'system',
        updatedAt: new Date(),
        userId: userId as EntityId,
        version: 1,
      }
      seed.set(key, created)
      return created
    }

    if (!existing || existing.version !== expectedVersion) return 'version_conflict'
    const updated: UserPreferences = {
      ...existing,
      ...patch,
      updatedAt: new Date(),
      version: existing.version + 1,
    }
    seed.set(key, updated)
    return updated
  },
})

export const createFakeWorkspaceAccountsLookup = (hasAny = false): WorkspaceAccountsLookup => ({
  async hasAny() {
    return hasAny
  },
})
