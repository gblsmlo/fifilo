import type { EntityId } from '../primitives'
import type { UserPreferences, UserPreferencesPatch } from './user-preferences'
import type { WorkspaceSettings, WorkspaceSettingsPatch } from './workspace-settings'

export type UpsertOutcome<T> = T | 'version_conflict'

export type WorkspaceSettingsRepository = {
  findByOrganizationId: (organizationId: string) => Promise<WorkspaceSettings | null>
  /** `expectedVersion: 0` means "no row exists yet" - the adapter inserts instead of updating. */
  upsert: (
    organizationId: string,
    patch: WorkspaceSettingsPatch,
    expectedVersion: number,
  ) => Promise<UpsertOutcome<WorkspaceSettings>>
}

export type UserPreferencesRepository = {
  findByUser: (organizationId: string, userId: EntityId) => Promise<UserPreferences | null>
  upsert: (
    organizationId: string,
    userId: EntityId,
    patch: UserPreferencesPatch,
    expectedVersion: number,
  ) => Promise<UpsertOutcome<UserPreferences>>
}

/**
 * The minimal read `updateWorkspaceSettings` needs from accounts (Decision
 * 003) - not the full `AccountRepository` - to enforce "changing currency
 * with an existing account is a conflict" (Fase 06 § Modelagem).
 */
export type WorkspaceAccountsLookup = {
  hasAny: (organizationId: string) => Promise<boolean>
}
