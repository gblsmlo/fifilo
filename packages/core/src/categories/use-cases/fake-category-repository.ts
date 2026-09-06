import type { Category } from '../category'
import type {
  CategoryRepository,
  CategoryUpdatePatch,
  NewCategoryRecord,
  UpdateOutcome,
} from '../ports'

/** An in-memory stand-in for the Drizzle adapter, shared by this folder's tests. */
export const createFakeCategoryRepository = (
  seed: Category[] = [],
  transactionCountsByCategoryId: Record<string, number> = {},
): CategoryRepository => {
  const categories = new Map(seed.map((category) => [category.id, category]))

  const findByNameKey = (
    organizationId: string,
    parentId: string | null,
    kind: Category['kind'],
    nameKey: string,
  ): Category | null =>
    [...categories.values()].find(
      (category) =>
        category.organizationId === organizationId &&
        category.parentId === parentId &&
        category.kind === kind &&
        !category.archivedAt &&
        category.name.trim().toLowerCase() === nameKey,
    ) ?? null

  return {
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
      return transactionCountsByCategoryId[id] ?? 0
    },

    async create(record: NewCategoryRecord) {
      if (
        findByNameKey(
          record.organizationId,
          record.parentId,
          record.kind,
          record.name.trim().toLowerCase(),
        )
      ) {
        return null
      }

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
      return findByNameKey(organizationId, parentId, kind, nameKey)
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

    async reassignAndArchive(organizationId, id, _targetCategoryId) {
      const category = categories.get(id)
      if (!category || category.organizationId !== organizationId) return null
      const archived: Category = {
        ...category,
        archivedAt: new Date(),
        version: category.version + 1,
      }
      categories.set(id, archived)
      transactionCountsByCategoryId[id] = 0
      return archived
    },

    async update(
      organizationId: string,
      id,
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
