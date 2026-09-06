import type { CategoryKind } from '@fifilo/core/categories'
import type { EntityId } from '@fifilo/core/primitives'
import type { CategoryLookup } from '@fifilo/core/transactions'
import { categories } from '@fifilo/infra-database/schema'
import { withWorkspaceTransaction } from '@fifilo/infra-database/workspace'
import { and, eq } from 'drizzle-orm'

/** The minimal read `packages/core/src/transactions` needs from categories (Decision 003) - not the full `CategoryRepository`. */
export const createCategoriesLookup = (): CategoryLookup => ({
  async findActiveById(organizationId, id: EntityId) {
    return withWorkspaceTransaction(organizationId, async (tx) => {
      const [row] = await tx
        .select({
          archivedAt: categories.archivedAt,
          id: categories.id,
          kind: categories.kind,
        })
        .from(categories)
        .where(and(eq(categories.organizationId, organizationId), eq(categories.id, id)))
        .limit(1)

      if (!row) return null
      return { archivedAt: row.archivedAt, id: row.id as EntityId, kind: row.kind as CategoryKind }
    })
  },
})
