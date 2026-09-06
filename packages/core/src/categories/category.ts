import type { EntityId } from '../primitives'

export type CategoryKind = 'expense' | 'income'

export type Category = {
  archivedAt: Date | null
  color: string | null
  createdAt: Date
  icon: string | null
  id: EntityId
  kind: CategoryKind
  name: string
  organizationId: string
  parentId: EntityId | null
  updatedAt: Date
  version: number
}

/** Compared without case or leading/trailing space, same rule as accounts. */
export const normalizeCategoryName = (name: string): string => name.trim()

export const categoryNameKey = (name: string): string => normalizeCategoryName(name).toLowerCase()

/**
 * A name collides only within the same parent and kind (Fase 02 § Modelagem):
 * "Transporte" under "Casa" and "Transporte" at the top level are different
 * categories. `parentId` normalizes to the empty string for the top level so
 * the composite key has no null to special-case.
 */
export const categoryScopeKey = (parentId: EntityId | null): string => parentId ?? ''
