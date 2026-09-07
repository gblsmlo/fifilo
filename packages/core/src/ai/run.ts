import type { CurrencyCode, EntityId } from '../primitives'

/**
 * Mirrors `@fifilo/ai`'s own `RunStatus` deliberately, not by import -
 * `packages/core` stays independent of `packages/ai` the same way it stays
 * independent of every other sibling package (Decision 001).
 */
export type AiRunStatus = 'aborted' | 'cancelled' | 'completed' | 'failed' | 'timeout'

export type AiActorType = 'system' | 'user'

export type AiRun = {
  actorId: EntityId | null
  actorType: AiActorType
  costMinor: number
  currency: CurrencyCode
  durationMs: number | null
  error: string | null
  finishedAt: Date | null
  id: EntityId
  inputTokens: number
  kind: string
  model: string
  organizationId: string
  outputTokens: number
  provider: string
  startedAt: Date
  status: AiRunStatus
}

export type StartAiRunInput = {
  actorId: EntityId | null
  actorType: AiActorType
  kind: string
  model: string
  organizationId: string
  provider: string
}

export type FinishAiRunInput = {
  costMinor: number
  currency: CurrencyCode
  error: string | null
  id: EntityId
  inputTokens: number
  outputTokens: number
  status: AiRunStatus
}
