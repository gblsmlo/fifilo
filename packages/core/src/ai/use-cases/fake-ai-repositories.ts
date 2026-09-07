import { generateEntityId } from '../../primitives'
import type { AiBudget, AiBudgetPatch } from '../budget'
import type {
  AiBudgetRepository,
  AiKillSwitchRepository,
  AiRunRepository,
  UpsertOutcome,
} from '../ports'
import type { AiRun, StartAiRunInput } from '../run'

export const createFakeAiRunRepository = (
  seed: Map<string, AiRun> = new Map(),
): AiRunRepository => ({
  async finish(organizationId, input) {
    const existing = seed.get(input.id)
    if (!existing || existing.organizationId !== organizationId) return false
    seed.set(input.id, {
      ...existing,
      costMinor: input.costMinor,
      currency: input.currency,
      error: input.error,
      finishedAt: new Date(),
      inputTokens: input.inputTokens,
      outputTokens: input.outputTokens,
      status: input.status,
    })
    return true
  },
  async start(input: StartAiRunInput) {
    const id = generateEntityId()
    const startedAt = new Date()
    seed.set(id, {
      ...input,
      costMinor: 0,
      currency: 'BRL',
      durationMs: null,
      error: null,
      finishedAt: null,
      id,
      inputTokens: 0,
      outputTokens: 0,
      startedAt,
      status: 'completed',
    })
    return { id, startedAt }
  },
})

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
