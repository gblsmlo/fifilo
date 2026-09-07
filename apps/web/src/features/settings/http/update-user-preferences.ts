import type { UpdateUserPreferencesRequest, UserPreferencesResponse } from '@fifilo/core/settings'
import { api } from '@libs/api-client'

import { normalizeSettingsRequestError } from './errors'

export async function updateUserPreferences(
  payload: UpdateUserPreferencesRequest,
): Promise<UserPreferencesResponse> {
  const { data, error } = await api.settings.preferences.patch(payload)

  if (error) {
    throw normalizeSettingsRequestError(error.value, 'Não foi possível salvar suas preferências.')
  }

  return data
}
