import type { EntityId } from '@fifilo/core/primitives'
import type {
  NewTransactionRecord,
  Transaction,
  TransactionKind,
  TransactionLeg,
  TransactionListFilter,
  TransactionListPage,
  TransactionRepository,
  TransactionUpdatePatch,
  UpdateOutcome,
} from '@fifilo/core/transactions'
import { entries, transactions } from '@fifilo/infra-database/schema'
import { withWorkspaceTransaction } from '@fifilo/infra-database/workspace'
import { and, desc, eq, gte, ilike, inArray, lte, sql } from 'drizzle-orm'

type TransactionRow = typeof transactions.$inferSelect
type EntryRow = typeof entries.$inferSelect

/**
 * Bun's `SQL` driver parses a `date` column into a JS `Date` at runtime,
 * ahead of Drizzle's own string-mode column type (Decision 018: `occurredOn`
 * is a civil date, never a datetime). Every read of `transactions.occurred_on`
 * goes through this to keep the boundary honest.
 */
const toDateOnly = (value: string | Date): string =>
  value instanceof Date ? value.toISOString().slice(0, 10) : value

const mapRow = (row: TransactionRow, legRows: EntryRow[]): Transaction => ({
  categoryId: row.categoryId as EntityId | null,
  createdAt: row.createdAt,
  createdBy: row.createdBy as EntityId,
  description: row.description,
  id: row.id as EntityId,
  kind: row.kind as TransactionKind,
  legs: legRows.map(
    (leg): TransactionLeg => ({
      accountId: leg.accountId as EntityId,
      amountMinor: leg.amountMinor,
    }),
  ),
  notes: row.notes,
  occurredOn: toDateOnly(row.occurredOn),
  organizationId: row.organizationId,
  updatedAt: row.updatedAt,
  version: row.version,
})

const findTransactionById = async (
  organizationId: string,
  id: EntityId,
): Promise<Transaction | null> =>
  withWorkspaceTransaction(organizationId, async (tx) => {
    const [row] = await tx
      .select()
      .from(transactions)
      .where(and(eq(transactions.organizationId, organizationId), eq(transactions.id, id)))
      .limit(1)

    if (!row) return null

    const legRows = await tx
      .select()
      .from(entries)
      .where(and(eq(entries.organizationId, organizationId), eq(entries.transactionId, id)))

    return mapRow(row, legRows)
  })

/**
 * The transaction row and every leg are written in the same database
 * transaction (Decision 021, Fase 02 § Riscos): a transfer never ends up
 * with one leg persisted and the other missing.
 */
const createTransactionRow = async (record: NewTransactionRecord): Promise<Transaction> =>
  withWorkspaceTransaction(record.organizationId, async (tx) => {
    const [inserted] = await tx
      .insert(transactions)
      .values({
        categoryId: record.categoryId,
        createdAt: record.createdAt,
        createdBy: record.createdBy,
        description: record.description,
        id: record.id,
        kind: record.kind,
        notes: record.notes,
        occurredOn: record.occurredOn,
        organizationId: record.organizationId,
        updatedAt: record.createdAt,
      })
      .returning()

    if (!inserted) throw new Error('transactions insert returned no row.')

    const legRows =
      record.legs.length > 0
        ? await tx
            .insert(entries)
            .values(
              record.legs.map((leg) => ({
                accountId: leg.accountId,
                amountMinor: leg.amountMinor,
                currency: leg.currency,
                id: leg.id,
                occurredOn: record.occurredOn,
                organizationId: record.organizationId,
                transactionId: record.id,
              })),
            )
            .returning()
        : []

    return mapRow(inserted, legRows)
  })

/** Deletes and reinserts every leg rather than diffing (Fase 02 § Modelagem). */
const updateTransactionRow = async (
  organizationId: string,
  id: EntityId,
  expectedVersion: number,
  patch: TransactionUpdatePatch,
): Promise<UpdateOutcome> =>
  withWorkspaceTransaction(organizationId, async (tx) => {
    const [updated] = await tx
      .update(transactions)
      .set({
        categoryId: patch.categoryId,
        description: patch.description,
        notes: patch.notes,
        occurredOn: patch.occurredOn,
        updatedAt: sql`now()`,
        version: sql`${transactions.version} + 1`,
      })
      .where(
        and(
          eq(transactions.organizationId, organizationId),
          eq(transactions.id, id),
          eq(transactions.version, expectedVersion),
        ),
      )
      .returning()

    if (!updated) {
      const [existing] = await tx
        .select({ id: transactions.id })
        .from(transactions)
        .where(and(eq(transactions.organizationId, organizationId), eq(transactions.id, id)))
        .limit(1)

      return existing ? 'version_conflict' : 'not_found'
    }

    await tx
      .delete(entries)
      .where(and(eq(entries.organizationId, organizationId), eq(entries.transactionId, id)))

    const legRows =
      patch.legs.length > 0
        ? await tx
            .insert(entries)
            .values(
              patch.legs.map((leg) => ({
                accountId: leg.accountId,
                amountMinor: leg.amountMinor,
                currency: leg.currency,
                id: leg.id,
                occurredOn: patch.occurredOn,
                organizationId,
                transactionId: id,
              })),
            )
            .returning()
        : []

    return mapRow(updated, legRows)
  })

const deleteTransactionRow = async (organizationId: string, id: EntityId): Promise<boolean> =>
  withWorkspaceTransaction(organizationId, async (tx) => {
    await tx
      .delete(entries)
      .where(and(eq(entries.organizationId, organizationId), eq(entries.transactionId, id)))

    const deleted = await tx
      .delete(transactions)
      .where(and(eq(transactions.organizationId, organizationId), eq(transactions.id, id)))
      .returning({ id: transactions.id })

    return deleted.length > 0
  })

/**
 * Cursor pagination on `(occurred_on, id)` (Fase 02 § API): a row-value
 * comparison, so the "same date, different ids" boundary is one condition,
 * never an OR that a tie can slip through.
 */
const listTransactionRows = async (
  organizationId: string,
  filter: TransactionListFilter,
): Promise<TransactionListPage> =>
  withWorkspaceTransaction(organizationId, async (tx) => {
    const conditions = [eq(transactions.organizationId, organizationId)]

    if (filter.categoryId) conditions.push(eq(transactions.categoryId, filter.categoryId))
    if (filter.kind) conditions.push(eq(transactions.kind, filter.kind))
    if (filter.from) conditions.push(gte(transactions.occurredOn, filter.from))
    if (filter.to) conditions.push(lte(transactions.occurredOn, filter.to))
    if (filter.q) conditions.push(ilike(transactions.description, `%${filter.q}%`))
    if (filter.accountId) {
      conditions.push(
        sql`exists (
          select 1 from ${entries}
          where ${entries.organizationId} = ${transactions.organizationId}
            and ${entries.transactionId} = ${transactions.id}
            and ${entries.accountId} = ${filter.accountId}
        )`,
      )
    }
    if (filter.cursor) {
      conditions.push(
        sql`(${transactions.occurredOn}, ${transactions.id}) < (${filter.cursor.occurredOn}, ${filter.cursor.id})`,
      )
    }

    const rows = await tx
      .select()
      .from(transactions)
      .where(and(...conditions))
      .orderBy(desc(transactions.occurredOn), desc(transactions.id))
      .limit(filter.limit + 1)

    const hasMore = rows.length > filter.limit
    const page = hasMore ? rows.slice(0, filter.limit) : rows
    const pageIds = page.map((row) => row.id)

    const legRows =
      pageIds.length > 0
        ? await tx
            .select()
            .from(entries)
            .where(
              and(
                eq(entries.organizationId, organizationId),
                inArray(entries.transactionId, pageIds),
              ),
            )
        : []

    const legsByTransactionId = new Map<string, EntryRow[]>()
    for (const leg of legRows) {
      if (!leg.transactionId) continue
      const list = legsByTransactionId.get(leg.transactionId) ?? []
      list.push(leg)
      legsByTransactionId.set(leg.transactionId, list)
    }

    const items = page.map((row) => mapRow(row, legsByTransactionId.get(row.id) ?? []))
    const last = page.at(-1)

    return {
      items,
      nextCursor:
        hasMore && last
          ? { id: last.id as EntityId, occurredOn: toDateOnly(last.occurredOn) }
          : null,
    }
  })

export const createTransactionsRepository = (): TransactionRepository => ({
  create: createTransactionRow,
  delete: deleteTransactionRow,
  findById: findTransactionById,
  list: listTransactionRows,
  update: updateTransactionRow,
})
