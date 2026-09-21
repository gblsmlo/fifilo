import { type WorkspaceRole, requireFinancialOnboardingAccess } from '../access-control'
import type { FinancialOnboardingStatus } from '../contracts/onboarding'
import { forbiddenError } from '../errors'
import { type Result, err, ok } from '../result'
import type { FinancialOnboardingProgressRepository } from './ports'

export type GetFinancialOnboardingStatusQuery = {
  accountCreated: boolean
  organizationId: string
  role: WorkspaceRole
  settingsConfigured: boolean
  userId: string
}

export const getFinancialOnboardingStatus = async (
  query: GetFinancialOnboardingStatusQuery,
  repository: Pick<FinancialOnboardingProgressRepository, 'findByUser'>,
): Promise<FinancialOnboardingStatus> => {
  const progress = await repository.findByUser(query.organizationId, query.userId)
  const eligible = requireFinancialOnboardingAccess(query.role) && progress !== null
  const complete = query.settingsConfigured && query.accountCreated
  const dismissed = eligible && progress?.dismissedAt !== null

  return {
    organizationId: query.organizationId,
    eligible,
    dismissed,
    complete,
    reminderVisible: eligible && !complete && dismissed,
    steps: {
      workspaceSettings: query.settingsConfigured,
      firstAccount: query.accountCreated,
    },
  }
}

export type StartFinancialOnboardingCommand = {
  organizationId: string
  role: WorkspaceRole
  userId: string
}

export type StartFinancialOnboardingError = ReturnType<typeof forbiddenError<'insufficient_role'>>

/**
 * Makes the workspace ready for the setup journey, idempotently. Eligibility
 * here is the role alone, not the progress row: the row is exactly what this
 * repairs, so requiring it would make a workspace whose creation hook failed
 * permanently ineligible (`BUG-003`).
 */
export const startFinancialOnboarding = async (
  command: StartFinancialOnboardingCommand,
  repository: Pick<FinancialOnboardingProgressRepository, 'ensure'>,
): Promise<Result<void, StartFinancialOnboardingError>> => {
  if (!requireFinancialOnboardingAccess(command.role)) {
    return err(
      forbiddenError('insufficient_role', 'Only the workspace owner can start onboarding.'),
    )
  }

  await repository.ensure(command.organizationId, command.userId)
  return ok(undefined)
}

export type DismissFinancialOnboardingCommand = {
  organizationId: string
  role: WorkspaceRole
  userId: string
}

export type DismissFinancialOnboardingError =
  | ReturnType<typeof forbiddenError<'insufficient_role'>>
  | ReturnType<typeof forbiddenError<'ineligible'>>

export const dismissFinancialOnboarding = async (
  command: DismissFinancialOnboardingCommand,
  repository: FinancialOnboardingProgressRepository,
): Promise<Result<void, DismissFinancialOnboardingError>> => {
  if (!requireFinancialOnboardingAccess(command.role)) {
    return err(
      forbiddenError('insufficient_role', 'Only the workspace owner can dismiss onboarding.'),
    )
  }

  const progress = await repository.findByUser(command.organizationId, command.userId)
  if (!progress)
    return err(forbiddenError('ineligible', 'This actor is not eligible for onboarding.'))

  await repository.dismiss(command.organizationId, command.userId)
  return ok(undefined)
}
