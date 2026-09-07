import type {
  UpdateWorkspaceSettingsRequest,
  WorkspaceSettingsResponse,
} from '@fifilo/core/settings'
import { api } from '@libs/api-client'

import { normalizeSettingsRequestError } from './errors'

export async function updateWorkspaceSettings(
  payload: UpdateWorkspaceSettingsRequest,
): Promise<WorkspaceSettingsResponse> {
  const { data, error } = await api.settings.workspace.patch(payload)

  if (error) {
    throw normalizeSettingsRequestError(
      error.value,
      'Não foi possível salvar as configurações do workspace.',
    )
  }

  return data
}
