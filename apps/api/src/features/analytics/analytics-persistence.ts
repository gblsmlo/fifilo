import type { AccountKind } from '@fifilo/core/accounts'
import type {
  AccountBalanceSeries,
  AnalyticsReader,
  BalancePoint,
  CategorySpendRow,
} from '@fifilo/core/analytics'
import type { EntityId } from '@fifilo/core/primitives'
import {
  cardInvoices,
  categories,
  entries,
  financialAccounts,
  transactions,
} from '@fifilo/infra-database/schema'
import { withWorkspaceTransaction } from '@fifilo/infra-database/workspace'
import { and, asc, desc, eq, gte, lte, ne, sql } from 'drizzle-orm'

/**
 * Bun's `SQL` driver parses a `date` column into a JS `Date` at runtime,
 * ahead of Drizzle's own string-mode column type (Fase 02's own finding,
 * repeated here for the same reason every reader of a `date` column repeats
 * it - `invoices-persistence.ts` is the sibling copy).
 */
const toDateOnly = (value: string | Date): string =>
  value instanceof Date ? value.toISOString().slice(0, 10) : value

const toNumber = (value: string | number | null): number => Number(value ?? 0)

/**
 * Every projection excludes a transfer by joining `transactions` and
 * filtering its `kind` (Fase 05 § Modelagem) - the same fact Decision 023
 * expresses as "a transfer's own category is always null", read here from
 * the side that is cheapest to index.
 */
const notTransfer = ne(transactions.kind, 'transfer')

export const createAnalyticsReader = (): AnalyticsReader => ({
  async balanceEvolution(query) {
    return withWorkspaceTransaction(query.organizationId, async (tx) => {
      const accountFilter = query.accountId
        ? and(
            eq(entries.organizationId, query.organizationId),
            eq(entries.accountId, query.accountId),
          )
        : eq(entries.organizationId, query.organizationId)

      const rows = await tx
        .select({
          accountId: entries.accountId,
          balanceMinor: sql<string>`sum(sum(${entries.amountMinor})) over (partition by ${entries.accountId} order by ${entries.occurredOn})`,
          date: entries.occurredOn,
        })
        .from(entries)
        .where(
          and(
            accountFilter,
            gte(entries.occurredOn, query.from),
            lte(entries.occurredOn, query.to),
          ),
        )
        .groupBy(entries.accountId, entries.occurredOn)
        .orderBy(asc(entries.accountId), asc(entries.occurredOn))

      const byAccount = new Map<EntityId, BalancePoint[]>()
      for (const row of rows) {
        const accountId = row.accountId as EntityId
        const points = byAccount.get(accountId) ?? []
        points.push({ balanceMinor: toNumber(row.balanceMinor), date: toDateOnly(row.date) })
        byAccount.set(accountId, points)
      }

      const accounts: AccountBalanceSeries[] = Array.from(byAccount.entries()).map(
        ([accountId, points]) => ({ accountId, points }),
      )

      const consolidatedRows = await tx
        .select({
          balanceMinor: sql<string>`sum(sum(${entries.amountMinor})) over (order by ${entries.occurredOn})`,
          date: entries.occurredOn,
        })
        .from(entries)
        .where(
          and(
            eq(entries.organizationId, query.organizationId),
            gte(entries.occurredOn, query.from),
            lte(entries.occurredOn, query.to),
          ),
        )
        .groupBy(entries.occurredOn)
        .orderBy(asc(entries.occurredOn))

      const consolidated: BalancePoint[] = consolidatedRows.map((row) => ({
        balanceMinor: toNumber(row.balanceMinor),
        date: toDateOnly(row.date),
      }))

      return { accounts, consolidated }
    })
  },

  async consolidatedBalance(organizationId, asOf) {
    return withWorkspaceTransaction(organizationId, async (tx) => {
      const [cash] = await tx
        .select({ totalMinor: sql<string>`coalesce(sum(${entries.amountMinor}), 0)` })
        .from(entries)
        .innerJoin(
          financialAccounts,
          and(
            eq(financialAccounts.organizationId, entries.organizationId),
            eq(financialAccounts.id, entries.accountId),
          ),
        )
        .where(
          and(
            eq(entries.organizationId, organizationId),
            ne(financialAccounts.kind, 'credit_card'),
            lte(entries.occurredOn, asOf),
          ),
        )

      // Committed = unpaid closed invoices + what the open invoice already
      // owes (the same formula as `computeAvailableLimit`, Fase 03 §
      // Modelagem), summed across every card in the workspace instead of one
      // account.
      const [closed] = await tx
        .select({ totalMinor: sql<string>`coalesce(sum(${cardInvoices.totalMinor}), 0)` })
        .from(cardInvoices)
        .where(
          and(
            eq(cardInvoices.organizationId, organizationId),
            eq(cardInvoices.status, 'closed'),
            lte(cardInvoices.periodEnd, asOf),
          ),
        )

      const [open] = await tx
        .select({ totalMinor: sql<string>`coalesce(sum(-${entries.amountMinor}), 0)` })
        .from(entries)
        .innerJoin(cardInvoices, eq(cardInvoices.id, entries.invoiceId))
        .where(
          and(
            eq(entries.organizationId, organizationId),
            eq(cardInvoices.status, 'open'),
            lte(entries.occurredOn, asOf),
          ),
        )

      return {
        availableCashMinor: toNumber(cash?.totalMinor ?? null),
        committedInvoiceMinor:
          toNumber(closed?.totalMinor ?? null) + toNumber(open?.totalMinor ?? null),
      }
    })
  },

  async monthlyCashflow(query) {
    return withWorkspaceTransaction(query.organizationId, async (tx) => {
      const rows = await tx
        .select({
          expenseMinor: sql<string>`coalesce(sum(case when ${entries.amountMinor} < 0 then -${entries.amountMinor} else 0 end), 0)`,
          incomeMinor: sql<string>`coalesce(sum(case when ${entries.amountMinor} > 0 then ${entries.amountMinor} else 0 end), 0)`,
          month: sql<string>`to_char(${entries.occurredOn}, 'YYYY-MM')`,
        })
        .from(entries)
        .innerJoin(
          transactions,
          and(
            eq(transactions.organizationId, entries.organizationId),
            eq(transactions.id, entries.transactionId),
          ),
        )
        .where(
          and(
            eq(entries.organizationId, query.organizationId),
            notTransfer,
            gte(entries.occurredOn, query.from),
            lte(entries.occurredOn, query.to),
          ),
        )
        .groupBy(sql`to_char(${entries.occurredOn}, 'YYYY-MM')`)
        .orderBy(sql`to_char(${entries.occurredOn}, 'YYYY-MM')`)

      return rows.map((row) => ({
        expenseMinor: toNumber(row.expenseMinor),
        incomeMinor: toNumber(row.incomeMinor),
        month: row.month,
      }))
    })
  },

  async spendByAccount(query) {
    return withWorkspaceTransaction(query.organizationId, async (tx) => {
      const rows = await tx
        .select({
          accountId: financialAccounts.id,
          accountName: financialAccounts.name,
          kind: financialAccounts.kind,
          totalMinor: sql<string>`coalesce(sum(-${entries.amountMinor}), 0)`,
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
        .where(
          and(
            eq(entries.organizationId, query.organizationId),
            eq(transactions.kind, 'expense'),
            gte(entries.occurredOn, query.from),
            lte(entries.occurredOn, query.to),
          ),
        )
        .groupBy(financialAccounts.id, financialAccounts.name, financialAccounts.kind)
        .orderBy(desc(sql`sum(-${entries.amountMinor})`))

      return rows.map((row) => ({
        accountId: row.accountId as EntityId,
        accountName: row.accountName,
        kind: row.kind as AccountKind,
        totalMinor: toNumber(row.totalMinor),
      }))
    })
  },

  async spendByCategory(query) {
    return withWorkspaceTransaction(query.organizationId, async (tx) => {
      const rows = await tx
        .select({
          categoryId: categories.id,
          categoryName: categories.name,
          parentId: categories.parentId,
          totalMinor: sql<string>`coalesce(sum(-${entries.amountMinor}), 0)`,
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
          categories,
          and(
            eq(categories.organizationId, transactions.organizationId),
            eq(categories.id, transactions.categoryId),
          ),
        )
        .where(
          and(
            eq(entries.organizationId, query.organizationId),
            eq(categories.kind, query.kind),
            gte(entries.occurredOn, query.from),
            lte(entries.occurredOn, query.to),
          ),
        )
        .groupBy(categories.id, categories.name, categories.parentId)
        .orderBy(desc(sql`sum(-${entries.amountMinor})`))

      const result: CategorySpendRow[] = rows.map((row) => ({
        categoryId: row.categoryId as EntityId,
        categoryName: row.categoryName,
        parentId: row.parentId as EntityId | null,
        totalMinor: toNumber(row.totalMinor),
      }))

      return result
    })
  },

  async topExpenses(query) {
    return withWorkspaceTransaction(query.organizationId, async (tx) => {
      const rows = await tx
        .select({
          amountMinor: sql<string>`-${entries.amountMinor}`,
          categoryName: categories.name,
          description: transactions.description,
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
        .leftJoin(
          categories,
          and(
            eq(categories.organizationId, transactions.organizationId),
            eq(categories.id, transactions.categoryId),
          ),
        )
        .where(
          and(
            eq(entries.organizationId, query.organizationId),
            eq(transactions.kind, 'expense'),
            gte(entries.occurredOn, query.from),
            lte(entries.occurredOn, query.to),
          ),
        )
        .orderBy(desc(sql`-${entries.amountMinor}`))
        .limit(query.limit)

      return rows.map((row) => ({
        amountMinor: toNumber(row.amountMinor),
        categoryName: row.categoryName,
        description: row.description,
        occurredOn: toDateOnly(row.occurredOn),
        transactionId: row.transactionId as EntityId,
      }))
    })
  },
})
