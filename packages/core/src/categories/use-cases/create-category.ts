import { type DomainError, conflictError, validationError } from '../../errors'
import type { EntityId } from '../../primitives'
import { generateEntityId } from '../../primitives'
import { type Result, err, ok } from '../../result'
import type { Category, CategoryKind } from '../category'
import { categoryNameKey, normalizeCategoryName } from '../category'
import type { CategoryRepository } from '../ports'

export type CreateCategoryCommand = {
  color: string | null
  icon: string | null
  kind: CategoryKind
  name: string
  organizationId: string
  parentId: EntityId | null
}

export type CreateCategoryError = DomainError<
  'conflict' | 'validation',
  'category_name_taken' | 'invalid_category_kind'
>

export const createCategory = async (
  command: CreateCategoryCommand,
  repository: CategoryRepository,
): Promise<Result<Category, CreateCategoryError>> => {
  if (command.parentId) {
    const parent = await repository.findById(command.organizationId, command.parentId)

    if (!parent) {
      return err(validationError('invalid_category_kind', 'Parent category not found.'))
    }
    if (parent.parentId) {
      return err(
        validationError('invalid_category_kind', 'Only one level of subcategory is supported.'),
      )
    }
    if (parent.kind !== command.kind) {
      return err(
        validationError(
          'invalid_category_kind',
          'A subcategory must have the same kind as its parent.',
        ),
      )
    }
  }

  const nameKey = categoryNameKey(command.name)
  const existing = await repository.findByName(
    command.organizationId,
    command.parentId,
    command.kind,
    nameKey,
  )

  if (existing) {
    return err(conflictError('category_name_taken', 'This category name is already in use.'))
  }

  const created = await repository.create({
    color: command.color,
    createdAt: new Date(),
    icon: command.icon,
    id: generateEntityId(),
    kind: command.kind,
    name: normalizeCategoryName(command.name),
    organizationId: command.organizationId,
    parentId: command.parentId,
  })

  // Mirrors accounts: the database's own partial unique index is the real
  // enforcement of the (parent, kind, name) scope; this lookup is the fast
  // path (Decision 002).
  if (!created) {
    return err(conflictError('category_name_taken', 'This category name is already in use.'))
  }

  return ok(created)
}
