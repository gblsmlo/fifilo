import { type DomainError, conflictError } from '../../errors'
import { type Result, err, ok } from '../../result'
import type { AiBudgetRepository } from '../ports'

export type CheckBudgetQuery = {
  organizationId: string
  period: string
}

export type CheckBudgetError = DomainError<'conflict', 'ai_budget_exceeded'>

/**
 * A workspace with no budget row has no limit (Fase 07 § Guardrails #3: the
 * unlimited state is a named, valid one, not an oversight) - `checkBudget`
 * only refuses once a limit was explicitly set and already reached. Actual
 * cost is unknowable before a run completes, so this can only ever check
 * whether the period is *already* exhausted, never reserve the coming run's
 * own cost in advance.
 */
export const checkBudget = async (
  query: CheckBudgetQuery,
  repository: AiBudgetRepository,
): Promise<Result<true, CheckBudgetError>> => {
  const budget = await repository.findByPeriod(query.organizationId, query.period)
  if (!budget || budget.limitMinor === null) return ok(true)

  if (budget.consumedMinor >= budget.limitMinor) {
    return err(
      conflictError('ai_budget_exceeded', `The AI budget for ${query.period} has been used up.`),
    )
  }

  return ok(true)
}
