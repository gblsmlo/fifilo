import type {
  AiBudgetRepository,
  AiRunRepository,
  FinishAiRunInput,
  FinishRunError,
} from '@fifilo/core/ai'
import { finishRun, recordSpend } from '@fifilo/core/ai'
import type { EntityId } from '@fifilo/core/primitives'
import type { Result } from '@fifilo/core/result'
import type { AuditEvent } from '@fifilo/observability/runtime'
import { auditEvent as recordAuditEvent } from '@fifilo/observability/runtime'

export type RecordRunOutcomeCommand = FinishAiRunInput & {
  actorId: EntityId | null
  organizationId: string
  /** `YYYY-MM` - only consulted when `costMinor > 0`, so a failed run with no cost never touches the budget. */
  period: string
}

/**
 * The one call after `backend.run()` finishes (Fase 07 § Guardrails: "evento
 * de auditoria por chamada") - finishes the run row, records whatever it
 * actually cost against the period's budget, and audits the outcome. A
 * failed run still finishes and still audits; it simply never had a
 * positive cost to record.
 */
export const recordRunOutcome = async (
  command: RecordRunOutcomeCommand,
  runRepository: AiRunRepository,
  budgetRepository: AiBudgetRepository,
  emitAuditEvent: (event: AuditEvent) => void = recordAuditEvent,
): Promise<Result<true, FinishRunError>> => {
  const { actorId, organizationId, period, ...finishInput } = command

  const result = await finishRun({ organizationId, ...finishInput }, runRepository)
  if (!result.ok) return result

  if (finishInput.costMinor > 0) {
    await recordSpend(
      { amountMinor: finishInput.costMinor, organizationId, period },
      budgetRepository,
    )
  }

  emitAuditEvent({
    action: 'ai.run.completed',
    actorId: actorId ?? undefined,
    actorType: 'user',
    entityId: finishInput.id,
    entityType: 'ai_run',
    metadata: { costMinor: finishInput.costMinor, status: finishInput.status },
    workspaceId: organizationId,
  })

  return result
}
