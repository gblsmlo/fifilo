import type { AiBudget, AiBudgetPatch, AiBudgetRepository, UpsertOutcome } from '@fifilo/core/ai'
import type { CurrencyCode } from '@fifilo/core/primitives'
import { aiBudgets } from '@fifilo/infra-database/schema'
import { withWorkspaceTransaction } from '@fifilo/infra-database/workspace'
import { and, eq, sql } from 'drizzle-orm'

type AiBudgetRow = typeof aiBudgets.$inferSelect

const mapRow = (row: AiBudgetRow): AiBudget => ({
  consumedMinor: row.consumedMinor,
  currency: row.currency as CurrencyCode,
  limitMinor: row.limitMinor,
  organizationId: row.organizationId,
  period: row.period,
  version: row.version,
})

const findByPeriod = async (organizationId: string, period: string): Promise<AiBudget | null> =>
  withWorkspaceTransaction(organizationId, async (tx) => {
    const [row] = await tx
      .select()
      .from(aiBudgets)
      .where(and(eq(aiBudgets.organizationId, organizationId), eq(aiBudgets.period, period)))
      .limit(1)

    return row ? mapRow(row) : null
  })

/**
 * Lazily materializes the period's row on its first spend (no
 * `expectedVersion` gate here, unlike `setLimit`): recording an
 * already-incurred cost must never be rejected by a stale-version race,
 * only accumulate. `sql`-side increment, not read-then-write, so two
 * concurrent runs' spend both land instead of one clobbering the other.
 */
const recordSpend = async (
  organizationId: string,
  period: string,
  amountMinor: number,
): Promise<AiBudget> =>
  withWorkspaceTransaction(organizationId, async (tx) => {
    const [row] = await tx
      .insert(aiBudgets)
      .values({ consumedMinor: amountMinor, organizationId, period })
      .onConflictDoUpdate({
        set: {
          consumedMinor: sql`${aiBudgets.consumedMinor} + ${amountMinor}`,
          updatedAt: sql`now()`,
        },
        target: [aiBudgets.organizationId, aiBudgets.period],
      })
      .returning()

    if (!row) throw new Error('Failed to record AI budget spend.')
    return mapRow(row)
  })

const setLimit = async (
  organizationId: string,
  period: string,
  patch: AiBudgetPatch,
  expectedVersion: number,
): Promise<UpsertOutcome<AiBudget>> =>
  withWorkspaceTransaction(organizationId, async (tx) => {
    if (expectedVersion === 0) {
      const inserted = await tx
        .insert(aiBudgets)
        .values({
          currency: patch.currency,
          limitMinor: patch.limitMinor,
          organizationId,
          period,
        })
        .onConflictDoNothing({ target: [aiBudgets.organizationId, aiBudgets.period] })
        .returning()

      if (inserted[0]) return mapRow(inserted[0])
      return 'version_conflict'
    }

    const updated = await tx
      .update(aiBudgets)
      .set({
        currency: patch.currency,
        limitMinor: patch.limitMinor,
        updatedAt: sql`now()`,
        version: sql`${aiBudgets.version} + 1`,
      })
      .where(
        and(
          eq(aiBudgets.organizationId, organizationId),
          eq(aiBudgets.period, period),
          eq(aiBudgets.version, expectedVersion),
        ),
      )
      .returning()

    if (updated[0]) return mapRow(updated[0])
    return 'version_conflict'
  })

export const createAiBudgetRepository = (): AiBudgetRepository => ({
  findByPeriod,
  recordSpend,
  setLimit,
})
