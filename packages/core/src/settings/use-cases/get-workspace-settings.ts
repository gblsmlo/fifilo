import { type Result, ok } from '../../result'
import type { WorkspaceSettingsRepository } from '../ports'
import { DEFAULT_WORKSPACE_SETTINGS, type WorkspaceSettings } from '../workspace-settings'

export type GetWorkspaceSettingsQuery = {
  organizationId: string
}

/** A workspace that never opened Settings still resolves a currency, a timezone and a month start - never a null a caller must special-case. */
export const getWorkspaceSettings = async (
  query: GetWorkspaceSettingsQuery,
  repository: WorkspaceSettingsRepository,
): Promise<Result<WorkspaceSettings, never>> => {
  const existing = await repository.findByOrganizationId(query.organizationId)

  if (existing) return ok(existing)

  return ok({
    ...DEFAULT_WORKSPACE_SETTINGS,
    organizationId: query.organizationId,
    updatedAt: null,
    version: 0,
  })
}
