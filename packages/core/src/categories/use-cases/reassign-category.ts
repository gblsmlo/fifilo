import {
  type AccessControlError,
  type WorkspaceRole,
  requireFinancialWriteAccess,
} from '../../access-control'
import { type DomainError, notFoundError, validationError } from '../../errors'
import type { EntityId } from '../../primitives'
import { type Result, err, ok } from '../../result'
import type { Category } from '../category'
import type { CategoryRepository } from '../ports'

export type ReassignCategoryCommand = {
  id: EntityId
  organizationId: string
  role: WorkspaceRole
  targetCategoryId: EntityId | null
}

export type ReassignCategoryError =
  | DomainError<
      'not_found' | 'validation',
      'category_not_found' | 'invalid_target_category' | 'target_category_required'
    >
  | AccessControlError

/**
 * A category with nothing pointing at it just archives. One with existing
 * transactions requires a same-kind target: the exit path Fase 02 uses
 * instead of the hard block the reference implementation shipped (the
 * defect this whole flow exists to close).
 */
export const reassignCategory = async (
  command: ReassignCategoryCommand,
  repository: CategoryRepository,
): Promise<Result<Category, ReassignCategoryError>> => {
  const access = requireFinancialWriteAccess(command.role)
  if (!access.ok) return access

  const category = await repository.findById(command.organizationId, command.id)
  if (!category) return err(notFoundError('category_not_found', 'Category not found.'))

  const transactionCount = await repository.countTransactions(command.organizationId, command.id)

  if (transactionCount === 0) {
    const archived = await repository.archive(command.organizationId, command.id)
    if (!archived) return err(notFoundError('category_not_found', 'Category not found.'))
    return ok(archived)
  }

  if (!command.targetCategoryId) {
    return err(
      validationError(
        'target_category_required',
        'Choose a category to move existing transactions to.',
      ),
    )
  }

  if (command.targetCategoryId === command.id) {
    return err(
      validationError('invalid_target_category', 'Choose a different category as the target.'),
    )
  }

  const target = await repository.findById(command.organizationId, command.targetCategoryId)
  if (!target) return err(notFoundError('category_not_found', 'Target category not found.'))
  if (target.kind !== category.kind) {
    return err(
      validationError('invalid_target_category', 'The target category must have the same kind.'),
    )
  }

  const archived = await repository.reassignAndArchive(
    command.organizationId,
    command.id,
    command.targetCategoryId,
  )

  if (!archived) return err(notFoundError('category_not_found', 'Category not found.'))
  return ok(archived)
}
