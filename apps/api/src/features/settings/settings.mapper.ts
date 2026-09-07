import type {
  UserPreferences,
  UserPreferencesResponse,
  WorkspaceSettings,
  WorkspaceSettingsResponse,
} from '@fifilo/core/settings'

export const toWorkspaceSettingsResponse = (
  settings: WorkspaceSettings,
): WorkspaceSettingsResponse => ({
  ...settings,
  updatedAt: settings.updatedAt ? settings.updatedAt.toISOString() : null,
})

export const toUserPreferencesResponse = (
  preferences: UserPreferences,
): UserPreferencesResponse => ({
  ...preferences,
  updatedAt: preferences.updatedAt ? preferences.updatedAt.toISOString() : null,
})
