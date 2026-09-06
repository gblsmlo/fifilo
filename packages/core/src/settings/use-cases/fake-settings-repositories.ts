import type { EntityId } from '../../primitives'
import type {
  UpsertOutcome,
  UserPreferencesRepository,
  WorkspaceAccountsLookup,
  WorkspaceSettingsRepository,
} from '../ports'
import { DEFAULT_USER_PREFERENCES, type UserPreferences } from '../user-preferences'
import { DEFAULT_WORKSPACE_SETTINGS, type WorkspaceSettings } from '../workspace-settings'

/**
 * An in-memory stand-in for the Drizzle adapter, mirroring the "row may not
 * exist yet" upsert contract `workspace_settings`/`user_preferences` share
 * (Fase 06 § Modelagem): `expectedVersion: 0` creates, anything else updates
 * an existing row at that exact version.
 */
export const createFakeWorkspaceSettingsRepository = (
  seed: WorkspaceSettings[] = [],
): WorkspaceSettingsRepository => {
  const rows = new Map(seed.map((row) => [row.organizationId, row]))

  return {
    async findByOrganizationId(organizationId) {
      return rows.get(organizationId) ?? null
    },

    async upsert(
      organizationId,
      patch,
      expectedVersion,
    ): Promise<UpsertOutcome<WorkspaceSettings>> {
      const existing = rows.get(organizationId) ?? null

      if (!existing) {
        if (expectedVersion !== 0) return 'version_conflict'
        const created: WorkspaceSettings = {
          ...DEFAULT_WORKSPACE_SETTINGS,
          ...patch,
          organizationId,
          updatedAt: new Date(),
          version: 1,
        }
        rows.set(organizationId, created)
        return created
      }

      if (existing.version !== expectedVersion) return 'version_conflict'

      const updated: WorkspaceSettings = {
        ...existing,
        ...patch,
        updatedAt: new Date(),
        version: existing.version + 1,
      }
      rows.set(organizationId, updated)
      return updated
    },
  }
}

export const createFakeWorkspaceAccountsLookup = (
  organizationsWithAccounts: readonly string[] = [],
): WorkspaceAccountsLookup => ({
  async hasAny(organizationId) {
    return organizationsWithAccounts.includes(organizationId)
  },
})

const userPreferencesKey = (organizationId: string, userId: EntityId): string =>
  `${organizationId}:${userId}`

export const createFakeUserPreferencesRepository = (
  seed: UserPreferences[] = [],
): UserPreferencesRepository => {
  const rows = new Map(seed.map((row) => [userPreferencesKey(row.organizationId, row.userId), row]))

  return {
    async findByUser(organizationId, userId) {
      return rows.get(userPreferencesKey(organizationId, userId)) ?? null
    },

    async upsert(
      organizationId,
      userId,
      patch,
      expectedVersion,
    ): Promise<UpsertOutcome<UserPreferences>> {
      const key = userPreferencesKey(organizationId, userId)
      const existing = rows.get(key) ?? null

      if (!existing) {
        if (expectedVersion !== 0) return 'version_conflict'
        const created: UserPreferences = {
          ...DEFAULT_USER_PREFERENCES,
          ...patch,
          organizationId,
          updatedAt: new Date(),
          userId,
          version: 1,
        }
        rows.set(key, created)
        return created
      }

      if (existing.version !== expectedVersion) return 'version_conflict'

      const updated: UserPreferences = {
        ...existing,
        ...patch,
        updatedAt: new Date(),
        version: existing.version + 1,
      }
      rows.set(key, updated)
      return updated
    },
  }
}
