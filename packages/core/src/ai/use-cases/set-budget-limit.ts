import {
  type AccessControlError,
  type WorkspaceRole,
  requireAiBudgetWriteAccess,
} from '../../access-control'
import { type DomainError, conflictError } from '../../errors'
import { type Result, err, ok } from '../../result'
import type { AiBudget, AiBudgetPatch } from '../budget'
import type { AiBudgetRepository } from '../ports'

export type SetBudgetLimitCommand = {
  expectedVersion: number
  organizationId: string
  patch: AiBudgetPatch
  period: string
  role: WorkspaceRole
}

export type SetBudgetLimitError = AccessControlError | DomainError<'conflict', 'version_conflict'>

export const setBudgetLimit = async (
  command: SetBudgetLimitCommand,
  repository: AiBudgetRepository,
): Promise<Result<AiBudget, SetBudgetLimitError>> => {
  const access = requireAiBudgetWriteAccess(command.role)
  if (!access.ok) return access

  const outcome = await repository.setLimit(
    command.organizationId,
    command.period,
    command.patch,
    command.expectedVersion,
  )

  if (outcome === 'version_conflict') {
    return err(conflictError('version_conflict', 'The AI budget changed since it was loaded.'))
  }

  return ok(outcome)
}
