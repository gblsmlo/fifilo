import { type DomainError, conflictError } from '../../errors'
import type { EntityId } from '../../primitives'
import { type Result, err, ok } from '../../result'
import type { UserPreferencesRepository } from '../ports'
import type { UserPreferences, UserPreferencesPatch } from '../user-preferences'

export type UpdateUserPreferencesCommand = {
  expectedVersion: number
  organizationId: string
  patch: UserPreferencesPatch
  userId: EntityId
}

export type UpdateUserPreferencesError = DomainError<'conflict', 'version_conflict'>

/**
 * No role check (Fase 06 § Modelagem): a preference is personal, not a
 * financial resource, so even a `viewer` sets their own theme and
 * notification setting - the command only ever touches the caller's own
 * `(organizationId, userId)` row, never one supplied by the client.
 */
export const updateUserPreferences = async (
  command: UpdateUserPreferencesCommand,
  repository: UserPreferencesRepository,
): Promise<Result<UserPreferences, UpdateUserPreferencesError>> => {
  const outcome = await repository.upsert(
    command.organizationId,
    command.userId,
    command.patch,
    command.expectedVersion,
  )

  if (outcome === 'version_conflict') {
    return err(conflictError('version_conflict', 'Preferences changed since they were loaded.'))
  }

  return ok(outcome)
}
