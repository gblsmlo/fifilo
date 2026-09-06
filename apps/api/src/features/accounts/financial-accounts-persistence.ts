import type {
  Account,
  AccountKind,
  AccountRepository,
  AccountUpdatePatch,
  NewAccountRecord,
  OpeningEntryRecord,
  UpdateOutcome,
} from '@fifilo/core/accounts'
import type { CurrencyCode, EntityId } from '@fifilo/core/primitives'
import { entries, financialAccounts } from '@fifilo/infra-database/schema'
import { withWorkspaceTransaction } from '@fifilo/infra-database/workspace'
import { and, eq, isNull, sql } from 'drizzle-orm'

type FinancialAccountRow = typeof financialAccounts.$inferSelect

/**
 * The row is Infra's; the mapper is where a plain string becomes the branded
 * id the rest of the system carries (Decision 014).
 */
const mapRow = (row: FinancialAccountRow): Account => ({
  archivedAt: row.archivedAt,
  color: row.color,
  createdAt: row.createdAt,
  createdBy: row.createdBy as EntityId,
  currency: row.currency as CurrencyCode,
  icon: row.icon,
  id: row.id as EntityId,
  institution: row.institution,
  kind: row.kind as AccountKind,
  name: row.name,
  organizationId: row.organizationId,
  updatedAt: row.updatedAt,
  version: row.version,
})

/** Postgres' `unique_violation` SQLSTATE, not a message substring (Decision 004). */
const isUniqueViolation = (error: unknown): boolean =>
  typeof error === 'object' && error !== null && (error as { errno?: string }).errno === '23505'

const findAccountByName = async (
  organizationId: string,
  nameKey: string,
): Promise<Account | null> =>
  withWorkspaceTransaction(organizationId, async (tx) => {
    const [row] = await tx
      .select()
      .from(financialAccounts)
      .where(
        and(
          eq(financialAccounts.organizationId, organizationId),
          sql`lower(${financialAccounts.name}) = ${nameKey}`,
          isNull(financialAccounts.archivedAt),
        ),
      )
      .limit(1)

    return row ? mapRow(row) : null
  })

const listAccountRows = async (
  organizationId: string,
  options: { includeArchived: boolean },
): Promise<Account[]> =>
  withWorkspaceTransaction(organizationId, async (tx) => {
    const conditions = [eq(financialAccounts.organizationId, organizationId)]
    if (!options.includeArchived) conditions.push(isNull(financialAccounts.archivedAt))

    const rows = await tx
      .select()
      .from(financialAccounts)
      .where(and(...conditions))

    return rows.map(mapRow)
  })

/**
 * The account and its opening entry share one invariant - a balance history
 * that starts explained (Fase 01 § Modelagem) - so they are written in the
 * same transaction (Decision 003), not two calls that could leave one without
 * the other.
 */
const createAccountRow = async (
  record: NewAccountRecord,
  openingEntry: OpeningEntryRecord | null,
): Promise<Account | null> => {
  try {
    return await withWorkspaceTransaction(record.organizationId, async (tx) => {
      const [inserted] = await tx
        .insert(financialAccounts)
        .values({
          color: record.color,
          createdAt: record.createdAt,
          createdBy: record.createdBy,
          currency: record.currency,
          icon: record.icon,
          id: record.id,
          institution: record.institution,
          kind: record.kind,
          name: record.name,
          organizationId: record.organizationId,
          updatedAt: record.createdAt,
        })
        .returning()

      if (!inserted) throw new Error('financial_accounts insert returned no row.')

      if (openingEntry) {
        await tx.insert(entries).values({
          accountId: record.id,
          amountMinor: openingEntry.amountMinor,
          currency: record.currency,
          id: openingEntry.id,
          occurredOn: openingEntry.occurredOn,
          organizationId: record.organizationId,
        })
      }

      return mapRow(inserted)
    })
  } catch (error) {
    // The partial unique index is the real enforcement (Fase 01 § Riscos);
    // the use case's upfront check is the fast path that usually avoids
    // reaching here at all.
    if (isUniqueViolation(error)) return null
    throw error
  }
}

const updateAccountRow = async (
  organizationId: string,
  id: EntityId,
  expectedVersion: number,
  patch: AccountUpdatePatch,
): Promise<UpdateOutcome> =>
  withWorkspaceTransaction(organizationId, async (tx) => {
    const [updated] = await tx
      .update(financialAccounts)
      .set({
        ...(patch.color !== undefined ? { color: patch.color } : {}),
        ...(patch.icon !== undefined ? { icon: patch.icon } : {}),
        ...(patch.institution !== undefined ? { institution: patch.institution } : {}),
        ...(patch.name !== undefined ? { name: patch.name } : {}),
        updatedAt: sql`now()`,
        version: sql`${financialAccounts.version} + 1`,
      })
      .where(
        and(
          eq(financialAccounts.organizationId, organizationId),
          eq(financialAccounts.id, id),
          eq(financialAccounts.version, expectedVersion),
        ),
      )
      .returning()

    if (updated) return mapRow(updated)

    // No row returned means either the account is not this workspace's, or
    // someone else already moved the version (operation.md § Optimistic
    // locking) - a second read is the only way to tell them apart, and it
    // only runs on this already-rare path.
    const [existing] = await tx
      .select({ id: financialAccounts.id })
      .from(financialAccounts)
      .where(
        and(eq(financialAccounts.organizationId, organizationId), eq(financialAccounts.id, id)),
      )
      .limit(1)

    return existing ? 'version_conflict' : 'not_found'
  })

const archiveAccountRow = async (organizationId: string, id: EntityId): Promise<Account | null> =>
  withWorkspaceTransaction(organizationId, async (tx) => {
    const [archived] = await tx
      .update(financialAccounts)
      .set({
        archivedAt: sql`now()`,
        updatedAt: sql`now()`,
        version: sql`${financialAccounts.version} + 1`,
      })
      .where(
        and(eq(financialAccounts.organizationId, organizationId), eq(financialAccounts.id, id)),
      )
      .returning()

    return archived ? mapRow(archived) : null
  })

export const createFinancialAccountRepository = (): AccountRepository => ({
  archive: archiveAccountRow,
  create: createAccountRow,
  findByName: findAccountByName,
  list: listAccountRows,
  update: updateAccountRow,
})
