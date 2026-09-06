import { type Result, err, ok } from './result'

/**
 * Branded identifiers and value primitives shared by core subdomains.
 *
 * `EntityId` keeps the exact same structural brand as the legacy
 * `@twincam/domain/domain-primitives` definition, so a core `EntityId` and a
 * domain `EntityId` are interchangeable during the migration.
 */
export type EntityId = string & { readonly __brand: 'EntityId' }
export type NonEmptyString = string & { readonly __brand: 'NonEmptyString' }
export type WorkspaceSlug = string & { readonly __brand: 'WorkspaceSlug' }

export type PrimitiveError = {
  code: 'invalid_entity_id' | 'invalid_name' | 'invalid_workspace_slug'
  message: string
}

const workspaceSlugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

export const entityId = (value: string): Result<EntityId, PrimitiveError> => {
  const id = value.trim()

  if (id.length === 0) {
    return err({
      code: 'invalid_entity_id',
      message: 'Entity id is required.',
    })
  }

  return ok(id as EntityId)
}

export const nonEmptyString = (
  value: string,
  field = 'Value',
): Result<NonEmptyString, PrimitiveError> => {
  const normalized = value.trim()

  if (normalized.length === 0) {
    return err({
      code: 'invalid_name',
      message: `${field} is required.`,
    })
  }

  return ok(normalized as NonEmptyString)
}

export const workspaceSlug = (value: string): Result<WorkspaceSlug, PrimitiveError> => {
  const normalized = value.trim().toLowerCase()

  if (!workspaceSlugPattern.test(normalized)) {
    return err({
      code: 'invalid_workspace_slug',
      message: 'Workspace slug must contain lowercase letters, numbers, and single hyphens.',
    })
  }

  return ok(normalized as WorkspaceSlug)
}
