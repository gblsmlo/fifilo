import type { EntityId } from '../primitives'
import type { Category, CategoryKind } from './category'

export type NewCategoryRecord = {
  color: string | null
  createdAt: Date
  icon: string | null
  id: EntityId
  kind: CategoryKind
  name: string
  organizationId: string
  parentId: EntityId | null
}

export type CategoryUpdatePatch = Partial<Pick<Category, 'color' | 'icon' | 'name'>>

export type UpdateOutcome = Category | 'not_found' | 'version_conflict'

/**
 * The persistence a use case needs, not the shape of `categories`
 * (Decision 003). `reassignAndArchive` moves every transaction that pointed
 * at `id` onto `targetCategoryId` and archives `id`, in one call, so the
 * adapter can guarantee it happens in a single transaction (Fase 02 §
 * Riscos: moving a thousand transactions and failing halfway must not leave
 * the category half-migrated).
 */
export type CategoryRepository = {
  archive: (organizationId: string, id: EntityId) => Promise<Category | null>
  countTransactions: (organizationId: string, id: EntityId) => Promise<number>
  create: (record: NewCategoryRecord) => Promise<Category | null>
  findByName: (
    organizationId: string,
    parentId: EntityId | null,
    kind: CategoryKind,
    nameKey: string,
  ) => Promise<Category | null>
  findById: (organizationId: string, id: EntityId) => Promise<Category | null>
  list: (organizationId: string, options: { includeArchived: boolean }) => Promise<Category[]>
  reassignAndArchive: (
    organizationId: string,
    id: EntityId,
    targetCategoryId: EntityId,
  ) => Promise<Category | null>
  update: (
    organizationId: string,
    id: EntityId,
    expectedVersion: number,
    patch: CategoryUpdatePatch,
  ) => Promise<UpdateOutcome>
}
