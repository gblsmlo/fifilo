import type { WorkspaceAccountsLookup } from '@fifilo/core/settings'
import { financialAccounts } from '@fifilo/infra-database/schema'
import { withWorkspaceTransaction } from '@fifilo/infra-database/workspace'
import { eq, sql } from 'drizzle-orm'

export const createWorkspaceAccountsLookup = (): WorkspaceAccountsLookup => ({
  async hasAny(organizationId) {
    return withWorkspaceTransaction(organizationId, async (tx) => {
      const [row] = await tx
        .select({ exists: sql<boolean>`true` })
        .from(financialAccounts)
        .where(eq(financialAccounts.organizationId, organizationId))
        .limit(1)

      return row !== undefined
    })
  },
})
