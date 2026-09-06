import {
  type AccessControlError,
  type WorkspaceRole,
  requireFinancialWriteAccess,
} from '../../access-control'
import { type DomainError, notFoundError } from '../../errors'
import type { EntityId } from '../../primitives'
import { type Result, err, ok } from '../../result'
import type { Account } from '../account'
import type { AccountRepository } from '../ports'

export type ArchiveAccountCommand = {
  id: EntityId
  organizationId: string
  role: WorkspaceRole
}

export type ArchiveAccountError = DomainError<'not_found', 'account_not_found'> | AccessControlError

/**
 * Archiving the last active account is allowed - the domain does not block
 * it, the Web only warns (Fase 01 § Modelagem) - so there is no invariant to
 * check here beyond the account existing and the actor's role.
 */
export const archiveAccount = async (
  command: ArchiveAccountCommand,
  repository: AccountRepository,
): Promise<Result<Account, ArchiveAccountError>> => {
  const access = requireFinancialWriteAccess(command.role)
  if (!access.ok) return access

  const archived = await repository.archive(command.organizationId, command.id)

  if (!archived) {
    return err(notFoundError('account_not_found', 'Account not found.'))
  }

  return ok(archived)
}
