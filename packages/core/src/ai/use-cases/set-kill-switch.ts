import {
  type AccessControlError,
  type WorkspaceRole,
  requireAiKillSwitchAccess,
} from '../../access-control'
import type { EntityId } from '../../primitives'
import { type Result, ok } from '../../result'
import type { AiKillSwitchRepository } from '../ports'

export type SetWorkspaceKillSwitchCommand = {
  enabled: boolean
  organizationId: string
  role: WorkspaceRole
  updatedBy: EntityId
}

/**
 * No use case wraps `setGlobal` (Fase 07 § Guardrails #4 names it, but this
 * fase ships no admin surface at all - `WorkspaceRole` has no meaning
 * outside one workspace, so a global toggle needs its own, differently
 * shaped authorization once something actually calls it).
 */
export const setWorkspaceKillSwitch = async (
  command: SetWorkspaceKillSwitchCommand,
  repository: AiKillSwitchRepository,
): Promise<Result<true, AccessControlError>> => {
  const access = requireAiKillSwitchAccess(command.role)
  if (!access.ok) return access

  await repository.setWorkspace(command.organizationId, command.enabled, command.updatedBy)
  return ok(true)
}
