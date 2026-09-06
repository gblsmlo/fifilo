import { type DomainError, notFoundError } from '../../errors'
import type { EntityId } from '../../primitives'
import { type Result, err, ok } from '../../result'
import type { TransactionRepository } from '../ports'

export type DeleteTransactionCommand = {
  id: EntityId
  organizationId: string
}

export type DeleteTransactionError = DomainError<'not_found', 'transaction_not_found'>

/** Deletes the transaction and its legs together (Fase 02 § API) - never one without the other. */
export const deleteTransaction = async (
  command: DeleteTransactionCommand,
  repository: TransactionRepository,
): Promise<Result<true, DeleteTransactionError>> => {
  const deleted = await repository.delete(command.organizationId, command.id)
  if (!deleted) return err(notFoundError('transaction_not_found', 'Transaction not found.'))
  return ok(true)
}
