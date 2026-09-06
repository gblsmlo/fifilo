import type {
  Category,
  CategoryRepository,
  CategoryUpdatePatch,
  NewCategoryRecord,
  UpdateOutcome,
} from '@fifilo/core/categories'
import { categoryNameKey, categoryScopeKey } from '@fifilo/core/categories'
import type { EntityId } from '@fifilo/core/primitives'

/**
 * An in-memory stand-in for the Drizzle adapter, local to this feature's
 * route tests. Not imported from `@fifilo/core`'s own use-case tests: a deep
 * path into another workspace's `src/` is not an export the package publishes
 * (Decision 001), so this stays a small, separately-owned copy instead.
 */
export const createFakeCategoryRepository = (
  seed: Category[] = [],
): CategoryRepository & { transactionCountsById: Map<string, number> } => {
  const categories = new Map(seed.map((category) => [category.id, category]))
  const transactionCountsById = new Map<string, number>()

  return {
    transactionCountsById,

    async archive(organizationId, id) {
      const category = categories.get(id)
      if (!category || category.organizationId !== organizationId) return null
      const archived: Category = {
        ...category,
        archivedAt: new Date(),
        version: category.version + 1,
      }
      categories.set(id, archived)
      return archived
    },

    async countTransactions(_organizationId, id) {
      return transactionCountsById.get(id) ?? 0
    },

    async create(record: NewCategoryRecord) {
      const nameKey = categoryNameKey(record.name)
      const scopeKey = categoryScopeKey(record.parentId)
      const collides = [...categories.values()].some(
        (category) =>
          category.organizationId === record.organizationId &&
          !category.archivedAt &&
          category.kind === record.kind &&
          categoryScopeKey(category.parentId) === scopeKey &&
          categoryNameKey(category.name) === nameKey,
      )
      if (collides) return null

      const category: Category = {
        archivedAt: null,
        color: record.color,
        createdAt: record.createdAt,
        icon: record.icon,
        id: record.id,
        kind: record.kind,
        name: record.name,
        organizationId: record.organizationId,
        parentId: record.parentId,
        updatedAt: record.createdAt,
        version: 1,
      }
      categories.set(category.id, category)
      return category
    },

    async findByName(organizationId, parentId, kind, nameKey) {
      const scopeKey = categoryScopeKey(parentId)
      return (
        [...categories.values()].find(
          (category) =>
            category.organizationId === organizationId &&
            !category.archivedAt &&
            category.kind === kind &&
            categoryScopeKey(category.parentId) === scopeKey &&
            categoryNameKey(category.name) === nameKey,
        ) ?? null
      )
    },

    async findById(organizationId, id) {
      const category = categories.get(id)
      return category && category.organizationId === organizationId ? category : null
    },

    async list(organizationId, options) {
      return [...categories.values()].filter(
        (category) =>
          category.organizationId === organizationId &&
          (options.includeArchived || !category.archivedAt),
      )
    },

    async reassignAndArchive(organizationId, id, targetCategoryId) {
      const category = categories.get(id)
      if (!category || category.organizationId !== organizationId) return null

      const currentCount = transactionCountsById.get(id) ?? 0
      const targetCount = transactionCountsById.get(targetCategoryId) ?? 0
      transactionCountsById.set(id, 0)
      transactionCountsById.set(targetCategoryId, targetCount + currentCount)

      const archived: Category = {
        ...category,
        archivedAt: new Date(),
        version: category.version + 1,
      }
      categories.set(id, archived)
      return archived
    },

    async update(
      organizationId: string,
      id: EntityId,
      expectedVersion: number,
      patch: CategoryUpdatePatch,
    ): Promise<UpdateOutcome> {
      const category = categories.get(id)
      if (!category || category.organizationId !== organizationId) return 'not_found'
      if (category.version !== expectedVersion) return 'version_conflict'

      const updated: Category = {
        ...category,
        ...patch,
        updatedAt: new Date(),
        version: category.version + 1,
      }
      categories.set(id, updated)
      return updated
    },
  }
}
