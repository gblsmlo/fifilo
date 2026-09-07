import type { UserPreferencesResponse } from '@fifilo/core/settings'
import { api } from '@libs/api-client'

import { normalizeSettingsRequestError } from './errors'

export async function getUserPreferences(): Promise<UserPreferencesResponse> {
  const { data, error } = await api.settings.preferences.get()

  if (error) {
    throw normalizeSettingsRequestError(error.value, 'Não foi possível carregar suas preferências.')
  }

  return data
}
