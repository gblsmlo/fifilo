import type { CurrencyCode } from '@fifilo/core/primitives'
import type {
  UpsertOutcome,
  WeekStart,
  WorkspaceSettings,
  WorkspaceSettingsPatch,
  WorkspaceSettingsRepository,
} from '@fifilo/core/settings'
import { workspaceSettings } from '@fifilo/infra-database/schema'
import { withWorkspaceTransaction } from '@fifilo/infra-database/workspace'
import { and, eq, sql } from 'drizzle-orm'

type WorkspaceSettingsRow = typeof workspaceSettings.$inferSelect

const mapRow = (row: WorkspaceSettingsRow): WorkspaceSettings => ({
  currency: row.currency as CurrencyCode,
  locale: row.locale,
  monthStartDay: row.monthStartDay,
  organizationId: row.organizationId,
  timezone: row.timezone,
  updatedAt: row.updatedAt,
  version: row.version,
  weekStartsOn: row.weekStartsOn as WeekStart,
})

const findByOrganizationId = async (organizationId: string): Promise<WorkspaceSettings | null> =>
  withWorkspaceTransaction(organizationId, async (tx) => {
    const [row] = await tx
      .select()
      .from(workspaceSettings)
      .where(eq(workspaceSettings.organizationId, organizationId))
      .limit(1)

    return row ? mapRow(row) : null
  })

/**
 * `expectedVersion: 0` inserts (Fase 06 § Modelagem's lazy-row contract);
 * anything else updates conditionally on that exact version, disambiguated
 * by one extra read the same way every other conditional update in this
 * codebase is (`categories-persistence.ts`, `transactions-persistence.ts`).
 */
const upsert = async (
  organizationId: string,
  patch: WorkspaceSettingsPatch,
  expectedVersion: number,
): Promise<UpsertOutcome<WorkspaceSettings>> =>
  withWorkspaceTransaction(organizationId, async (tx) => {
    if (expectedVersion === 0) {
      const inserted = await tx
        .insert(workspaceSettings)
        .values({
          currency: patch.currency ?? 'BRL',
          locale: patch.locale ?? 'pt-BR',
          monthStartDay: patch.monthStartDay ?? 1,
          organizationId,
          timezone: patch.timezone ?? 'America/Sao_Paulo',
          weekStartsOn: patch.weekStartsOn ?? 'monday',
        })
        .onConflictDoNothing({ target: workspaceSettings.organizationId })
        .returning()

      if (inserted[0]) return mapRow(inserted[0])
      return 'version_conflict'
    }

    const updated = await tx
      .update(workspaceSettings)
      .set({
        ...patch,
        updatedAt: sql`now()`,
        version: sql`${workspaceSettings.version} + 1`,
      })
      .where(
        and(
          eq(workspaceSettings.organizationId, organizationId),
          eq(workspaceSettings.version, expectedVersion),
        ),
      )
      .returning()

    if (updated[0]) return mapRow(updated[0])
    return 'version_conflict'
  })

export const createWorkspaceSettingsRepository = (): WorkspaceSettingsRepository => ({
  findByOrganizationId,
  upsert,
})
