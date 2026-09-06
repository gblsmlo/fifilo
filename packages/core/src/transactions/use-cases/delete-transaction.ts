import {
  type AccessControlError,
  type WorkspaceRole,
  requireFinancialWriteAccess,
} from '../../access-control'
import { type DomainError, notFoundError } from '../../errors'
import type { EntityId } from '../../primitives'
import { type Result, err, ok } from '../../result'
import type { TransactionRepository } from '../ports'

export type DeleteTransactionCommand = {
  id: EntityId
  organizationId: string
  role: WorkspaceRole
}

export type DeleteTransactionError =
  | DomainError<'not_found', 'transaction_not_found'>
  | AccessControlError

/** Deletes the transaction and its legs together (Fase 02 § API) - never one without the other. */
export const deleteTransaction = async (
  command: DeleteTransactionCommand,
  repository: TransactionRepository,
): Promise<Result<true, DeleteTransactionError>> => {
  const access = requireFinancialWriteAccess(command.role)
  if (!access.ok) return access

  const deleted = await repository.delete(command.organizationId, command.id)
  if (!deleted) return err(notFoundError('transaction_not_found', 'Transaction not found.'))
  return ok(true)
}
