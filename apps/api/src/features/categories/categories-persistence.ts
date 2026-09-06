import type {
  Category,
  CategoryKind,
  CategoryRepository,
  CategoryUpdatePatch,
  NewCategoryRecord,
  UpdateOutcome,
} from '@fifilo/core/categories'
import type { EntityId } from '@fifilo/core/primitives'
import { isUniqueViolation } from '@fifilo/infra-database/postgres-errors'
import { categories, transactions } from '@fifilo/infra-database/schema'
import { withWorkspaceTransaction } from '@fifilo/infra-database/workspace'
import { and, count, eq, isNull, sql } from 'drizzle-orm'

type CategoryRow = typeof categories.$inferSelect

const mapRow = (row: CategoryRow): Category => ({
  archivedAt: row.archivedAt,
  color: row.color,
  createdAt: row.createdAt,
  icon: row.icon,
  id: row.id as EntityId,
  kind: row.kind as CategoryKind,
  name: row.name,
  organizationId: row.organizationId,
  parentId: row.parentId as EntityId | null,
  updatedAt: row.updatedAt,
  version: row.version,
})

const findCategoryByName = async (
  organizationId: string,
  parentId: EntityId | null,
  kind: CategoryKind,
  nameKey: string,
): Promise<Category | null> =>
  withWorkspaceTransaction(organizationId, async (tx) => {
    const [row] = await tx
      .select()
      .from(categories)
      .where(
        and(
          eq(categories.organizationId, organizationId),
          parentId ? eq(categories.parentId, parentId) : isNull(categories.parentId),
          eq(categories.kind, kind),
          sql`lower(${categories.name}) = ${nameKey}`,
          isNull(categories.archivedAt),
        ),
      )
      .limit(1)

    return row ? mapRow(row) : null
  })

const findCategoryById = async (organizationId: string, id: EntityId): Promise<Category | null> =>
  withWorkspaceTransaction(organizationId, async (tx) => {
    const [row] = await tx
      .select()
      .from(categories)
      .where(and(eq(categories.organizationId, organizationId), eq(categories.id, id)))
      .limit(1)

    return row ? mapRow(row) : null
  })

const listCategoryRows = async (
  organizationId: string,
  options: { includeArchived: boolean },
): Promise<Category[]> =>
  withWorkspaceTransaction(organizationId, async (tx) => {
    const conditions = [eq(categories.organizationId, organizationId)]
    if (!options.includeArchived) conditions.push(isNull(categories.archivedAt))

    const rows = await tx
      .select()
      .from(categories)
      .where(and(...conditions))

    return rows.map(mapRow)
  })

const createCategoryRow = async (record: NewCategoryRecord): Promise<Category | null> => {
  try {
    return await withWorkspaceTransaction(record.organizationId, async (tx) => {
      const [inserted] = await tx
        .insert(categories)
        .values({
          color: record.color,
          createdAt: record.createdAt,
          icon: record.icon,
          id: record.id,
          kind: record.kind,
          name: record.name,
          organizationId: record.organizationId,
          parentId: record.parentId,
          updatedAt: record.createdAt,
        })
        .returning()

      if (!inserted) throw new Error('categories insert returned no row.')
      return mapRow(inserted)
    })
  } catch (error) {
    if (isUniqueViolation(error)) return null
    throw error
  }
}

const updateCategoryRow = async (
  organizationId: string,
  id: EntityId,
  expectedVersion: number,
  patch: CategoryUpdatePatch,
): Promise<UpdateOutcome> =>
  withWorkspaceTransaction(organizationId, async (tx) => {
    const [updated] = await tx
      .update(categories)
      .set({
        ...(patch.color !== undefined ? { color: patch.color } : {}),
        ...(patch.icon !== undefined ? { icon: patch.icon } : {}),
        ...(patch.name !== undefined ? { name: patch.name } : {}),
        updatedAt: sql`now()`,
        version: sql`${categories.version} + 1`,
      })
      .where(
        and(
          eq(categories.organizationId, organizationId),
          eq(categories.id, id),
          eq(categories.version, expectedVersion),
        ),
      )
      .returning()

    if (updated) return mapRow(updated)

    const [existing] = await tx
      .select({ id: categories.id })
      .from(categories)
      .where(and(eq(categories.organizationId, organizationId), eq(categories.id, id)))
      .limit(1)

    return existing ? 'version_conflict' : 'not_found'
  })

const archiveCategoryRow = async (organizationId: string, id: EntityId): Promise<Category | null> =>
  withWorkspaceTransaction(organizationId, async (tx) => {
    const [archived] = await tx
      .update(categories)
      .set({
        archivedAt: sql`now()`,
        updatedAt: sql`now()`,
        version: sql`${categories.version} + 1`,
      })
      .where(and(eq(categories.organizationId, organizationId), eq(categories.id, id)))
      .returning()

    return archived ? mapRow(archived) : null
  })

const countCategoryTransactions = async (organizationId: string, id: EntityId): Promise<number> =>
  withWorkspaceTransaction(organizationId, async (tx) => {
    const [row] = await tx
      .select({ value: count() })
      .from(transactions)
      .where(and(eq(transactions.organizationId, organizationId), eq(transactions.categoryId, id)))

    return row?.value ?? 0
  })

/**
 * Moves every transaction pointing at `id` onto `targetCategoryId`, then
 * archives `id` - one database transaction, so a failure partway through
 * leaves nothing half-migrated (Fase 02 § Riscos).
 */
const reassignAndArchiveCategoryRow = async (
  organizationId: string,
  id: EntityId,
  targetCategoryId: EntityId,
): Promise<Category | null> =>
  withWorkspaceTransaction(organizationId, async (tx) => {
    await tx
      .update(transactions)
      .set({
        categoryId: targetCategoryId,
        updatedAt: sql`now()`,
        version: sql`${transactions.version} + 1`,
      })
      .where(and(eq(transactions.organizationId, organizationId), eq(transactions.categoryId, id)))

    const [archived] = await tx
      .update(categories)
      .set({
        archivedAt: sql`now()`,
        updatedAt: sql`now()`,
        version: sql`${categories.version} + 1`,
      })
      .where(and(eq(categories.organizationId, organizationId), eq(categories.id, id)))
      .returning()

    return archived ? mapRow(archived) : null
  })

export const createCategoriesRepository = (): CategoryRepository => ({
  archive: archiveCategoryRow,
  countTransactions: countCategoryTransactions,
  create: createCategoryRow,
  findByName: findCategoryByName,
  findById: findCategoryById,
  list: listCategoryRows,
  reassignAndArchive: reassignAndArchiveCategoryRow,
  update: updateCategoryRow,
})
