import type {
  AiBudget,
  AiBudgetPatch,
  AiBudgetRepository,
  AiKillSwitchRepository,
  AiRunRepository,
  UpsertOutcome,
} from '@fifilo/core/ai'
import { generateEntityId } from '@fifilo/core/primitives'

/**
 * In-memory stands-in for this feature's own route/guard tests - not a deep
 * import of Core's own test-only fixture, which is not an export the
 * package publishes (Decision 001), mirroring every other feature's own
 * `*-test-support.ts`.
 */
export const createFakeAiBudgetRepository = (
  seed: Map<string, AiBudget> = new Map(),
): AiBudgetRepository => {
  const keyOf = (organizationId: string, period: string) => `${organizationId}:${period}`

  return {
    async findByPeriod(organizationId, period) {
      return seed.get(keyOf(organizationId, period)) ?? null
    },
    async recordSpend(organizationId, period, amountMinor) {
      const key = keyOf(organizationId, period)
      const existing = seed.get(key)
      const updated: AiBudget = existing
        ? { ...existing, consumedMinor: existing.consumedMinor + amountMinor }
        : {
            consumedMinor: amountMinor,
            currency: 'BRL',
            limitMinor: null,
            organizationId,
            period,
            version: 1,
          }
      seed.set(key, updated)
      return updated
    },
    async setLimit(
      organizationId: string,
      period: string,
      patch: AiBudgetPatch,
      expectedVersion: number,
    ): Promise<UpsertOutcome<AiBudget>> {
      const key = keyOf(organizationId, period)
      const existing = seed.get(key) ?? null

      if (expectedVersion === 0) {
        if (existing) return 'version_conflict'
        const created: AiBudget = {
          consumedMinor: 0,
          currency: patch.currency,
          limitMinor: patch.limitMinor,
          organizationId,
          period,
          version: 1,
        }
        seed.set(key, created)
        return created
      }

      if (!existing || existing.version !== expectedVersion) return 'version_conflict'
      const updated: AiBudget = { ...existing, ...patch, version: existing.version + 1 }
      seed.set(key, updated)
      return updated
    },
  }
}

export const createFakeAiKillSwitchRepository = (
  options: { global?: boolean; workspaces?: Set<string> } = {},
): AiKillSwitchRepository => {
  const workspaces = options.workspaces ?? new Set<string>()
  let global = options.global ?? false

  return {
    async isGloballyKilled() {
      return global
    },
    async isWorkspaceKilled(organizationId) {
      return workspaces.has(organizationId)
    },
    async setGlobal(enabled) {
      global = enabled
    },
    async setWorkspace(organizationId, enabled) {
      if (enabled) workspaces.add(organizationId)
      else workspaces.delete(organizationId)
    },
  }
}

export const createFakeAiRunRepository = (): AiRunRepository => ({
  async finish() {
    return true
  },
  async start() {
    return { id: generateEntityId(), startedAt: new Date() }
  },
})
