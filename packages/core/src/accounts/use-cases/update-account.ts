import { type DomainError, conflictError, notFoundError } from '../../errors'
import type { EntityId } from '../../primitives'
import { type Result, err, ok } from '../../result'
import type { Account } from '../account'
import { accountNameKey, normalizeAccountName } from '../account'
import type { AccountRepository, AccountUpdatePatch } from '../ports'

export type UpdateAccountCommand = {
  expectedVersion: number
  id: EntityId
  organizationId: string
  patch: AccountUpdatePatch
}

export type UpdateAccountError = DomainError<
  'conflict' | 'not_found',
  'account_name_taken' | 'account_not_found' | 'version_conflict'
>

export const updateAccount = async (
  command: UpdateAccountCommand,
  repository: AccountRepository,
): Promise<Result<Account, UpdateAccountError>> => {
  if (command.patch.name) {
    const nameKey = accountNameKey(command.patch.name)
    const existing = await repository.findByName(command.organizationId, nameKey)

    if (existing && existing.id !== command.id) {
      return err(conflictError('account_name_taken', 'An account with this name already exists.'))
    }
  }

  const patch: AccountUpdatePatch = command.patch.name
    ? { ...command.patch, name: normalizeAccountName(command.patch.name) }
    : command.patch

  const outcome = await repository.update(
    command.organizationId,
    command.id,
    command.expectedVersion,
    patch,
  )

  if (outcome === 'not_found') {
    return err(notFoundError('account_not_found', 'Account not found.'))
  }

  if (outcome === 'version_conflict') {
    return err(conflictError('version_conflict', 'This account changed since it was loaded.'))
  }

  return ok(outcome)
}
