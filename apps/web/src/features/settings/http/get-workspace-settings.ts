import type { WorkspaceSettingsResponse } from '@fifilo/core/settings'
import { api } from '@libs/api-client'

import { normalizeSettingsRequestError } from './errors'

export async function getWorkspaceSettings(): Promise<WorkspaceSettingsResponse> {
  const { data, error } = await api.settings.workspace.get()

  if (error) {
    throw normalizeSettingsRequestError(
      error.value,
      'Não foi possível carregar as configurações do workspace.',
    )
  }

  return data
}
