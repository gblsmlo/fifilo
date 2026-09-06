import type {
  CardInvoice,
  CloseInvoiceOutcome,
  InvoiceDomainStatus,
  InvoiceItem,
  InvoiceItemReader,
  InvoiceRepository,
  NewInvoiceRecord,
} from '@fifilo/core/credit-cards'
import type { EntityId } from '@fifilo/core/primitives'
import { cardInvoices, entries, transactions } from '@fifilo/infra-database/schema'
import { withWorkspaceTransaction } from '@fifilo/infra-database/workspace'
import { and, asc, eq, sql } from 'drizzle-orm'

type CardInvoiceRow = typeof cardInvoices.$inferSelect

/**
 * Bun's `SQL` driver parses a `date` column into a JS `Date` at runtime,
 * ahead of Drizzle's own string-mode column type (Fase 02's own finding,
 * repeated here for the same reason). Every read of a `date` column on this
 * table goes through this.
 */
const toDateOnly = (value: string | Date): string =>
  value instanceof Date ? value.toISOString().slice(0, 10) : value

const mapRow = (row: CardInvoiceRow): CardInvoice => ({
  accountId: row.accountId as EntityId,
  closedAt: row.closedAt,
  dueOn: toDateOnly(row.dueOn),
  id: row.id as EntityId,
  organizationId: row.organizationId,
  paidAt: row.paidAt,
  periodEnd: toDateOnly(row.periodEnd),
  periodStart: toDateOnly(row.periodStart),
  status: row.status as InvoiceDomainStatus,
  totalMinor: row.totalMinor,
  version: row.version,
})

const findInvoiceByAccountAndPeriodStart = async (
  organizationId: string,
  accountId: EntityId,
  periodStart: string,
): Promise<CardInvoice | null> =>
  withWorkspaceTransaction(organizationId, async (tx) => {
    const [row] = await tx
      .select()
      .from(cardInvoices)
      .where(
        and(
          eq(cardInvoices.organizationId, organizationId),
          eq(cardInvoices.accountId, accountId),
          eq(cardInvoices.periodStart, periodStart),
        ),
      )
      .limit(1)

    return row ? mapRow(row) : null
  })

const findInvoiceById = async (organizationId: string, id: EntityId): Promise<CardInvoice | null> =>
  withWorkspaceTransaction(organizationId, async (tx) => {
    const [row] = await tx
      .select()
      .from(cardInvoices)
      .where(and(eq(cardInvoices.organizationId, organizationId), eq(cardInvoices.id, id)))
      .limit(1)

    return row ? mapRow(row) : null
  })

/** The open invoice with the earliest period - the account's actual current cycle (`ports.ts`'s own doc comment on why). */
const findCurrentOpenByAccount = async (
  organizationId: string,
  accountId: EntityId,
): Promise<CardInvoice | null> =>
  withWorkspaceTransaction(organizationId, async (tx) => {
    const [row] = await tx
      .select()
      .from(cardInvoices)
      .where(
        and(
          eq(cardInvoices.organizationId, organizationId),
          eq(cardInvoices.accountId, accountId),
          eq(cardInvoices.status, 'open'),
        ),
      )
      .orderBy(asc(cardInvoices.periodStart))
      .limit(1)

    return row ? mapRow(row) : null
  })

/** Races on the same `(organization_id, account_id, period_start)` resolve to one row via the unique index, never a duplicate open invoice for the same cycle. */
const findOrCreateOpenInvoice = async (record: NewInvoiceRecord): Promise<CardInvoice> =>
  withWorkspaceTransaction(record.organizationId, async (tx) => {
    const inserted = await tx
      .insert(cardInvoices)
      .values({
        accountId: record.accountId,
        dueOn: record.dueOn,
        id: record.id,
        organizationId: record.organizationId,
        periodEnd: record.periodEnd,
        periodStart: record.periodStart,
      })
      .onConflictDoNothing({
        target: [cardInvoices.organizationId, cardInvoices.accountId, cardInvoices.periodStart],
      })
      .returning()

    if (inserted[0]) return mapRow(inserted[0])

    const [existing] = await tx
      .select()
      .from(cardInvoices)
      .where(
        and(
          eq(cardInvoices.organizationId, record.organizationId),
          eq(cardInvoices.accountId, record.accountId),
          eq(cardInvoices.periodStart, record.periodStart),
        ),
      )
      .limit(1)

    if (!existing) throw new Error('card_invoices insert conflicted but no row was found.')
    return mapRow(existing)
  })

const listInvoiceRows = async (
  organizationId: string,
  accountId: EntityId,
): Promise<CardInvoice[]> =>
  withWorkspaceTransaction(organizationId, async (tx) => {
    const rows = await tx
      .select()
      .from(cardInvoices)
      .where(
        and(eq(cardInvoices.organizationId, organizationId), eq(cardInvoices.accountId, accountId)),
      )

    return rows.map(mapRow)
  })

/**
 * Closes only from `open`, guarded by `expectedVersion` in the same
 * `where` (optimistic concurrency, Fase 01's own pattern). A miss is
 * disambiguated by one extra read, same as every other conditional update
 * in this codebase (`categories-persistence.ts`, `transactions-persistence.ts`).
 */
const closeInvoiceRow = async (
  organizationId: string,
  id: EntityId,
  expectedVersion: number,
  totalMinor: number,
): Promise<CloseInvoiceOutcome> =>
  withWorkspaceTransaction(organizationId, async (tx) => {
    const [updated] = await tx
      .update(cardInvoices)
      .set({
        closedAt: sql`now()`,
        status: 'closed',
        totalMinor,
        updatedAt: sql`now()`,
        version: sql`${cardInvoices.version} + 1`,
      })
      .where(
        and(
          eq(cardInvoices.organizationId, organizationId),
          eq(cardInvoices.id, id),
          eq(cardInvoices.status, 'open'),
          eq(cardInvoices.version, expectedVersion),
        ),
      )
      .returning()

    if (updated) return mapRow(updated)

    const [existing] = await tx
      .select()
      .from(cardInvoices)
      .where(and(eq(cardInvoices.organizationId, organizationId), eq(cardInvoices.id, id)))
      .limit(1)

    if (!existing) return 'not_found'
    if (existing.status !== 'open') return 'not_open'
    return 'version_conflict'
  })

const markInvoicePaid = async (
  organizationId: string,
  id: EntityId,
  paidAt: Date,
): Promise<CardInvoice | null> =>
  withWorkspaceTransaction(organizationId, async (tx) => {
    const [updated] = await tx
      .update(cardInvoices)
      .set({
        paidAt,
        status: 'paid',
        updatedAt: sql`now()`,
        version: sql`${cardInvoices.version} + 1`,
      })
      .where(and(eq(cardInvoices.organizationId, organizationId), eq(cardInvoices.id, id)))
      .returning()

    return updated ? mapRow(updated) : null
  })

/**
 * A card purchase is always a negative leg (the expense sign convention,
 * Fase 02 § Modelagem); the invoice's own total is the positive amount owed,
 * so the sum is negated here, once, at the boundary that crosses the sign.
 */
const sumInvoiceEntries = async (organizationId: string, invoiceId: EntityId): Promise<number> =>
  withWorkspaceTransaction(organizationId, async (tx) => {
    const [row] = await tx
      .select({ totalMinor: sql<string>`coalesce(sum(${entries.amountMinor}), 0)` })
      .from(entries)
      .where(and(eq(entries.organizationId, organizationId), eq(entries.invoiceId, invoiceId)))

    return -Number(row?.totalMinor ?? 0)
  })

/** `status` never stores `overdue` (`invoice.ts`'s own doc comment - it is a read-time label), so only `closed` needs summing here. */
const sumUnpaidClosedTotals = async (
  organizationId: string,
  accountId: EntityId,
): Promise<number> =>
  withWorkspaceTransaction(organizationId, async (tx) => {
    const [row] = await tx
      .select({ totalMinor: sql<string>`coalesce(sum(${cardInvoices.totalMinor}), 0)` })
      .from(cardInvoices)
      .where(
        and(
          eq(cardInvoices.organizationId, organizationId),
          eq(cardInvoices.accountId, accountId),
          eq(cardInvoices.status, 'closed'),
        ),
      )

    return Number(row?.totalMinor ?? 0)
  })

export const createInvoicesRepository = (): InvoiceRepository => ({
  close: closeInvoiceRow,
  findByAccountAndPeriodStart: findInvoiceByAccountAndPeriodStart,
  findById: findInvoiceById,
  findCurrentOpenByAccount,
  findOrCreateOpen: findOrCreateOpenInvoice,
  list: listInvoiceRows,
  markPaid: markInvoicePaid,
  sumEntries: sumInvoiceEntries,
  sumUnpaidClosedTotals,
})

const listInvoiceItemRows = async (
  organizationId: string,
  invoiceId: EntityId,
): Promise<InvoiceItem[]> =>
  withWorkspaceTransaction(organizationId, async (tx) => {
    const rows = await tx
      .select({
        amountMinor: entries.amountMinor,
        description: transactions.description,
        id: entries.id,
        installmentNumber: transactions.installmentNumber,
        occurredOn: entries.occurredOn,
      })
      .from(entries)
      .innerJoin(
        transactions,
        and(
          eq(transactions.organizationId, entries.organizationId),
          eq(transactions.id, entries.transactionId),
        ),
      )
      .where(and(eq(entries.organizationId, organizationId), eq(entries.invoiceId, invoiceId)))
      .orderBy(asc(entries.occurredOn))

    return rows.map((row) => ({
      amountMinor: row.amountMinor,
      description: row.description,
      id: row.id as EntityId,
      installmentNumber: row.installmentNumber,
      occurredOn: toDateOnly(row.occurredOn),
    }))
  })

export const createInvoiceItemReader = (): InvoiceItemReader => ({
  listByInvoice: listInvoiceItemRows,
})
