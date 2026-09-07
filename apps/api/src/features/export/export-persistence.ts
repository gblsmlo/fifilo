import type { ExportReader, ExportRow } from '@fifilo/core/export'
import type { CurrencyCode, EntityId } from '@fifilo/core/primitives'
import { categories, entries, financialAccounts, transactions } from '@fifilo/infra-database/schema'
import { withWorkspaceTransaction } from '@fifilo/infra-database/workspace'
import { and, asc, eq, gte, lte } from 'drizzle-orm'

/**
 * One row per entry (Decision 021), left-joined to its category (null for a
 * transfer, Decision 023) - every join keyed by `(organization_id, id)`
 * (Decision 019), so RLS filters every table before the join runs, not just
 * `entries`.
 */
const transactionRows = async (
  organizationId: string,
  from: string,
  to: string,
): Promise<ExportRow[]> =>
  withWorkspaceTransaction(organizationId, async (tx) => {
    const rows = await tx
      .select({
        accountName: financialAccounts.name,
        amountMinor: entries.amountMinor,
        categoryName: categories.name,
        currency: entries.currency,
        description: transactions.description,
        invoiceId: entries.invoiceId,
        kind: transactions.kind,
        occurredOn: entries.occurredOn,
        transactionId: transactions.id,
      })
      .from(entries)
      .innerJoin(
        transactions,
        and(
          eq(transactions.organizationId, entries.organizationId),
          eq(transactions.id, entries.transactionId),
        ),
      )
      .innerJoin(
        financialAccounts,
        and(
          eq(financialAccounts.organizationId, entries.organizationId),
          eq(financialAccounts.id, entries.accountId),
        ),
      )
      .leftJoin(
        categories,
        and(
          eq(categories.organizationId, transactions.organizationId),
          eq(categories.id, transactions.categoryId),
        ),
      )
      .where(
        and(
          eq(entries.organizationId, organizationId),
          gte(entries.occurredOn, from),
          lte(entries.occurredOn, to),
        ),
      )
      .orderBy(asc(entries.occurredOn), asc(transactions.id))

    return rows.map((row) => ({
      ...row,
      currency: row.currency as CurrencyCode,
      invoiceId: row.invoiceId as EntityId | null,
      transactionId: row.transactionId as EntityId,
    }))
  })

export const createExportReader = (): ExportReader => ({
  transactionRows,
})
