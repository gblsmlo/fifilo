import type { AiKillSwitchRepository } from '@fifilo/core/ai'
import type { EntityId } from '@fifilo/core/primitives'
import { db } from '@fifilo/infra-database/client'
import { aiGlobalKillSwitch, aiWorkspaceKillSwitches } from '@fifilo/infra-database/schema'
import { withWorkspaceTransaction } from '@fifilo/infra-database/workspace'
import { eq, sql } from 'drizzle-orm'

const GLOBAL_ROW_ID = 'global'

const isWorkspaceKilled = async (organizationId: string): Promise<boolean> =>
  withWorkspaceTransaction(organizationId, async (tx) => {
    const [row] = await tx
      .select({ enabled: aiWorkspaceKillSwitches.enabled })
      .from(aiWorkspaceKillSwitches)
      .where(eq(aiWorkspaceKillSwitches.organizationId, organizationId))
      .limit(1)

    return row?.enabled ?? false
  })

const setWorkspace = async (
  organizationId: string,
  enabled: boolean,
  updatedBy: EntityId | null,
): Promise<void> => {
  await withWorkspaceTransaction(organizationId, async (tx) => {
    await tx
      .insert(aiWorkspaceKillSwitches)
      .values({ enabled, organizationId, updatedBy })
      .onConflictDoUpdate({
        set: { enabled, updatedAt: sql`now()`, updatedBy },
        target: aiWorkspaceKillSwitches.organizationId,
      })
  })
}

/**
 * Not tenant data (Fase 07 § Persistência: `ai_global_kill_switch` carries
 * no `organization_id` and no RLS, the same reason `organizations` itself
 * has none) - reads and writes go through the plain client, never a
 * workspace transaction that has no workspace to scope.
 */
const isGloballyKilled = async (): Promise<boolean> => {
  const [row] = await db
    .select({ enabled: aiGlobalKillSwitch.enabled })
    .from(aiGlobalKillSwitch)
    .where(eq(aiGlobalKillSwitch.id, GLOBAL_ROW_ID))
    .limit(1)

  return row?.enabled ?? false
}

const setGlobal = async (enabled: boolean, updatedBy: EntityId | null): Promise<void> => {
  await db
    .insert(aiGlobalKillSwitch)
    .values({ enabled, id: GLOBAL_ROW_ID, updatedBy })
    .onConflictDoUpdate({
      set: { enabled, updatedAt: sql`now()`, updatedBy },
      target: aiGlobalKillSwitch.id,
    })
}

export const createAiKillSwitchRepository = (): AiKillSwitchRepository => ({
  isGloballyKilled,
  isWorkspaceKilled,
  setGlobal,
  setWorkspace,
})
