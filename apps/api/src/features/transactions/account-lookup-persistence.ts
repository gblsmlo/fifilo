import type { CurrencyCode, EntityId } from '@fifilo/core/primitives'
import type { AccountLookup } from '@fifilo/core/transactions'
import { financialAccounts } from '@fifilo/infra-database/schema'
import { withWorkspaceTransaction } from '@fifilo/infra-database/workspace'
import { and, eq } from 'drizzle-orm'

/** The minimal read `packages/core/src/transactions` needs from accounts (Decision 003) - not the full `AccountRepository`. */
export const createFinancialAccountLookup = (): AccountLookup => ({
  async findActiveById(organizationId, id: EntityId) {
    return withWorkspaceTransaction(organizationId, async (tx) => {
      const [row] = await tx
        .select({
          archivedAt: financialAccounts.archivedAt,
          currency: financialAccounts.currency,
          id: financialAccounts.id,
        })
        .from(financialAccounts)
        .where(
          and(eq(financialAccounts.organizationId, organizationId), eq(financialAccounts.id, id)),
        )
        .limit(1)

      if (!row) return null
      return {
        archivedAt: row.archivedAt,
        currency: row.currency as CurrencyCode,
        id: row.id as EntityId,
      }
    })
  },
})
