import type { AccountKind } from '@fifilo/core/accounts'
import type { CardAccountLookup } from '@fifilo/core/credit-cards'
import type { CurrencyCode, EntityId } from '@fifilo/core/primitives'
import { financialAccounts } from '@fifilo/infra-database/schema'
import { withWorkspaceTransaction } from '@fifilo/infra-database/workspace'
import { and, eq } from 'drizzle-orm'

/** The minimal read `packages/core/src/credit-cards` needs from accounts (Decision 003) - `kind` too, unlike the transactions module's own lookup, since a card use case must reject a non-card account. */
export const createCardAccountLookup = (): CardAccountLookup => ({
  async findById(organizationId, id: EntityId) {
    return withWorkspaceTransaction(organizationId, async (tx) => {
      const [row] = await tx
        .select({
          archivedAt: financialAccounts.archivedAt,
          currency: financialAccounts.currency,
          id: financialAccounts.id,
          kind: financialAccounts.kind,
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
        kind: row.kind as AccountKind,
      }
    })
  },
})
