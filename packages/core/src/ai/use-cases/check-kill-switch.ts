import { type DomainError, forbiddenError } from '../../errors'
import { type Result, err, ok } from '../../result'
import type { AiKillSwitchRepository } from '../ports'

export type CheckKillSwitchQuery = {
  organizationId: string
}

export type CheckKillSwitchError = DomainError<
  'forbidden',
  'ai_disabled_globally' | 'ai_disabled_for_workspace'
>

/**
 * Global is checked first (Fase 07 § Guardrails #4): a global kill flips
 * for every workspace at once, so it answers before a workspace-specific
 * lookup ever runs.
 */
export const checkKillSwitch = async (
  query: CheckKillSwitchQuery,
  repository: AiKillSwitchRepository,
): Promise<Result<true, CheckKillSwitchError>> => {
  if (await repository.isGloballyKilled()) {
    return err(
      forbiddenError('ai_disabled_globally', 'AI is currently disabled for every workspace.'),
    )
  }

  if (await repository.isWorkspaceKilled(query.organizationId)) {
    return err(forbiddenError('ai_disabled_for_workspace', 'AI is disabled for this workspace.'))
  }

  return ok(true)
}
