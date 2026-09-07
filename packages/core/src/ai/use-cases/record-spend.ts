import type { AiBudget } from '../budget'
import type { AiBudgetRepository } from '../ports'

export type RecordSpendCommand = {
  amountMinor: number
  organizationId: string
  period: string
}

/**
 * Runs after a call completes, cost now known (Fase 07 § Guardrails #3) -
 * this never refuses: a limit only blocks the *next* `checkBudget`, since
 * the cost already happened and must be recorded regardless. Lazily
 * materializes the period's row on its first spend, same contract
 * `workspace_settings` uses for "no row yet."
 */
export const recordSpend = async (
  command: RecordSpendCommand,
  repository: AiBudgetRepository,
): Promise<AiBudget> =>
  repository.recordSpend(command.organizationId, command.period, command.amountMinor)
