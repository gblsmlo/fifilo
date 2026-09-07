import type { AiBudgetRepository, AiKillSwitchRepository } from '@fifilo/core/ai'
import { checkBudget, checkKillSwitch } from '@fifilo/core/ai'
import type { DomainError } from '@fifilo/core/errors'
import type { Result } from '@fifilo/core/result'

export type GuardAiRunQuery = {
  organizationId: string
  /** `YYYY-MM` - the caller resolves it (typically the workspace's own civil "today"), this guard only checks it. */
  period: string
}

export type GuardAiRunError =
  | DomainError<'conflict', 'ai_budget_exceeded'>
  | DomainError<'forbidden', 'ai_disabled_globally' | 'ai_disabled_for_workspace'>

/**
 * The one call Fase 08's chat route makes before ever constructing an
 * `AgentBackend` (Fase 07 § Guardrails #3 and #4) - kill switch first
 * (cheapest check, and the one most likely to be "no" for every run of a
 * disabled workspace), budget second. Neither guard here checks
 * `organizationId` presence itself: that is `withRequiredContext`'s job,
 * enforced inside `packages/ai` on the backend the caller builds next.
 */
export const guardAiRun = async (
  query: GuardAiRunQuery,
  killSwitchRepository: AiKillSwitchRepository,
  budgetRepository: AiBudgetRepository,
): Promise<Result<true, GuardAiRunError>> => {
  const killSwitch = await checkKillSwitch(
    { organizationId: query.organizationId },
    killSwitchRepository,
  )
  if (!killSwitch.ok) return killSwitch

  return checkBudget(
    { organizationId: query.organizationId, period: query.period },
    budgetRepository,
  )
}
