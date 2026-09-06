import type { EntryReader } from '@fifilo/core/accounts'
import type { EntityId } from '@fifilo/core/primitives'
import { entries } from '@fifilo/infra-database/schema'
import { withWorkspaceTransaction } from '@fifilo/infra-database/workspace'
import { and, eq, lte, sql } from 'drizzle-orm'

/**
 * `sum()` over `bigint` comes back as PostgreSQL `numeric`, which the driver
 * returns as a string to avoid the precision loss `Number` would otherwise
 * risk (Decision 017) - converted here, once, at the one place a raw sum
 * crosses into the application.
 */
const readBalancesByAccount = async (
  organizationId: string,
  asOf: string,
): Promise<ReadonlyMap<EntityId, number>> =>
  withWorkspaceTransaction(organizationId, async (tx) => {
    const rows = await tx
      .select({
        accountId: entries.accountId,
        balanceMinor: sql<string>`sum(${entries.amountMinor})`,
      })
      .from(entries)
      .where(and(eq(entries.organizationId, organizationId), lte(entries.occurredOn, asOf)))
      .groupBy(entries.accountId)

    return new Map(rows.map((row) => [row.accountId as EntityId, Number(row.balanceMinor)]))
  })

export const createFinancialEntryReader = (): EntryReader => ({
  balancesByAccount: readBalancesByAccount,
})
