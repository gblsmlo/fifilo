import {
  type AccessControlError,
  type WorkspaceRole,
  requireSettingsWriteAccess,
} from '../../access-control'
import { type DomainError, conflictError, validationError } from '../../errors'
import { type Result, err, ok } from '../../result'
import type { WorkspaceAccountsLookup, WorkspaceSettingsRepository } from '../ports'
import {
  type WorkspaceSettings,
  type WorkspaceSettingsPatch,
  isValidMonthStartDay,
} from '../workspace-settings'

export type UpdateWorkspaceSettingsCommand = {
  expectedVersion: number
  organizationId: string
  patch: WorkspaceSettingsPatch
  role: WorkspaceRole
}

export type UpdateWorkspaceSettingsError =
  | DomainError<'conflict', 'currency_locked' | 'version_conflict'>
  | DomainError<'validation', 'invalid_month_start_day'>
  | AccessControlError

/**
 * `currency` locks the moment the workspace has any account (Fase 06 §
 * Modelagem): converting historical balances needs a rate and a date, out of
 * scope here, so the change is refused outright rather than silently
 * reinterpreting every existing minor-unit amount under a new currency.
 */
export const updateWorkspaceSettings = async (
  command: UpdateWorkspaceSettingsCommand,
  repository: WorkspaceSettingsRepository,
  accounts: WorkspaceAccountsLookup,
): Promise<Result<WorkspaceSettings, UpdateWorkspaceSettingsError>> => {
  const access = requireSettingsWriteAccess(command.role)
  if (!access.ok) return access

  if (
    command.patch.monthStartDay !== undefined &&
    !isValidMonthStartDay(command.patch.monthStartDay)
  ) {
    return err(
      validationError('invalid_month_start_day', 'The month must start between day 1 and day 28.'),
    )
  }

  if (command.patch.currency !== undefined) {
    const hasAccounts = await accounts.hasAny(command.organizationId)
    if (hasAccounts) {
      return err(
        conflictError(
          'currency_locked',
          'The workspace currency cannot change once an account exists.',
        ),
      )
    }
  }

  const outcome = await repository.upsert(
    command.organizationId,
    command.patch,
    command.expectedVersion,
  )

  if (outcome === 'version_conflict') {
    return err(conflictError('version_conflict', 'Settings changed since they were loaded.'))
  }

  return ok(outcome)
}
