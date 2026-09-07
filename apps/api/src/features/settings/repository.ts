import type {
  UserPreferencesRepository,
  WorkspaceAccountsLookup,
  WorkspaceSettingsRepository,
} from '@fifilo/core/settings'

import { createUserPreferencesRepository as createUserPreferencesRepositoryPersistence } from './user-preferences-persistence'
import { createWorkspaceAccountsLookup as createWorkspaceAccountsLookupPersistence } from './workspace-accounts-lookup-persistence'
import { createWorkspaceSettingsRepository as createWorkspaceSettingsRepositoryPersistence } from './workspace-settings-persistence'

/** Composition root only (Decision 003): no SQL or persistence rule lives here. */
export const createWorkspaceSettingsRepository = (): WorkspaceSettingsRepository =>
  createWorkspaceSettingsRepositoryPersistence()

export const createUserPreferencesRepository = (): UserPreferencesRepository =>
  createUserPreferencesRepositoryPersistence()

export const createWorkspaceAccountsLookup = (): WorkspaceAccountsLookup =>
  createWorkspaceAccountsLookupPersistence()
