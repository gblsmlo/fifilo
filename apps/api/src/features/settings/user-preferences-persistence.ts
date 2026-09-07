import type { EntityId } from '@fifilo/core/primitives'
import type {
  Density,
  Theme,
  UpsertOutcome,
  UserPreferences,
  UserPreferencesPatch,
  UserPreferencesRepository,
} from '@fifilo/core/settings'
import { userPreferences } from '@fifilo/infra-database/schema'
import { withActorWorkspaceTransaction } from '@fifilo/infra-database/workspace'
import { and, eq, sql } from 'drizzle-orm'

type UserPreferencesRow = typeof userPreferences.$inferSelect

const mapRow = (row: UserPreferencesRow): UserPreferences => ({
  density: row.density as Density,
  notifyByEmail: row.notifyByEmail,
  organizationId: row.organizationId,
  theme: row.theme as Theme,
  updatedAt: row.updatedAt,
  userId: row.userId as EntityId,
  version: row.version,
})

/**
 * `withActorWorkspaceTransaction`, not `withWorkspaceTransaction`: the
 * `user_preferences_workspace` RLS policy filters on `app.user_id` too
 * (Fase 06 § Modelagem), so every query here needs the actor context applied
 * or it sees no rows at all - even the caller's own.
 */
const findByUser = async (
  organizationId: string,
  userId: EntityId,
): Promise<UserPreferences | null> =>
  withActorWorkspaceTransaction(organizationId, userId, async (tx) => {
    const [row] = await tx
      .select()
      .from(userPreferences)
      .where(
        and(eq(userPreferences.organizationId, organizationId), eq(userPreferences.userId, userId)),
      )
      .limit(1)

    return row ? mapRow(row) : null
  })

const upsert = async (
  organizationId: string,
  userId: EntityId,
  patch: UserPreferencesPatch,
  expectedVersion: number,
): Promise<UpsertOutcome<UserPreferences>> =>
  withActorWorkspaceTransaction(organizationId, userId, async (tx) => {
    if (expectedVersion === 0) {
      const inserted = await tx
        .insert(userPreferences)
        .values({
          density: patch.density ?? 'comfortable',
          notifyByEmail: patch.notifyByEmail ?? true,
          organizationId,
          theme: patch.theme ?? 'system',
          userId,
        })
        .onConflictDoNothing({ target: [userPreferences.organizationId, userPreferences.userId] })
        .returning()

      if (inserted[0]) return mapRow(inserted[0])
      return 'version_conflict'
    }

    const updated = await tx
      .update(userPreferences)
      .set({
        ...patch,
        updatedAt: sql`now()`,
        version: sql`${userPreferences.version} + 1`,
      })
      .where(
        and(
          eq(userPreferences.organizationId, organizationId),
          eq(userPreferences.userId, userId),
          eq(userPreferences.version, expectedVersion),
        ),
      )
      .returning()

    if (updated[0]) return mapRow(updated[0])
    return 'version_conflict'
  })

export const createUserPreferencesRepository = (): UserPreferencesRepository => ({
  findByUser,
  upsert,
})
