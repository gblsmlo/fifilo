import { type DomainError, conflictError, notFoundError } from '../../errors'
import type { EntityId } from '../../primitives'
import { type Result, err, ok } from '../../result'
import type { Category } from '../category'
import { categoryNameKey, normalizeCategoryName } from '../category'
import type { CategoryRepository, CategoryUpdatePatch } from '../ports'

export type UpdateCategoryCommand = {
  expectedVersion: number
  id: EntityId
  organizationId: string
  patch: CategoryUpdatePatch
}

export type UpdateCategoryError = DomainError<
  'conflict' | 'not_found',
  'category_name_taken' | 'category_not_found' | 'version_conflict'
>

export const updateCategory = async (
  command: UpdateCategoryCommand,
  repository: CategoryRepository,
): Promise<Result<Category, UpdateCategoryError>> => {
  if (command.patch.name) {
    const current = await repository.findById(command.organizationId, command.id)
    if (!current) return err(notFoundError('category_not_found', 'Category not found.'))

    const nameKey = categoryNameKey(command.patch.name)
    const existing = await repository.findByName(
      command.organizationId,
      current.parentId,
      current.kind,
      nameKey,
    )

    if (existing && existing.id !== command.id) {
      return err(conflictError('category_name_taken', 'This category name is already in use.'))
    }
  }

  const patch: CategoryUpdatePatch = command.patch.name
    ? { ...command.patch, name: normalizeCategoryName(command.patch.name) }
    : command.patch

  const outcome = await repository.update(
    command.organizationId,
    command.id,
    command.expectedVersion,
    patch,
  )

  if (outcome === 'not_found')
    return err(notFoundError('category_not_found', 'Category not found.'))
  if (outcome === 'version_conflict') {
    return err(conflictError('version_conflict', 'This category changed since it was loaded.'))
  }

  return ok(outcome)
}
