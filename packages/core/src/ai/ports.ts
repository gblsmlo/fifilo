import type { EntityId } from '../primitives'
import type { AiBudget, AiBudgetPatch } from './budget'
import type { FinishAiRunInput, StartAiRunInput } from './run'

export type UpsertOutcome<T> = T | 'version_conflict'

export type AiRunRepository = {
  finish: (organizationId: string, input: FinishAiRunInput) => Promise<boolean>
  start: (input: StartAiRunInput) => Promise<{ id: EntityId; startedAt: Date }>
}

export type AiBudgetRepository = {
  findByPeriod: (organizationId: string, period: string) => Promise<AiBudget | null>
  /** Atomic increment - two concurrent runs recording spend must never race a read-then-write. */
  recordSpend: (organizationId: string, period: string, amountMinor: number) => Promise<AiBudget>
  /** `expectedVersion: 0` means "no row exists yet" - the adapter inserts instead of updating. */
  setLimit: (
    organizationId: string,
    period: string,
    patch: AiBudgetPatch,
    expectedVersion: number,
  ) => Promise<UpsertOutcome<AiBudget>>
}

export type AiKillSwitchRepository = {
  isGloballyKilled: () => Promise<boolean>
  isWorkspaceKilled: (organizationId: string) => Promise<boolean>
  setGlobal: (enabled: boolean, updatedBy: EntityId | null) => Promise<void>
  setWorkspace: (
    organizationId: string,
    enabled: boolean,
    updatedBy: EntityId | null,
  ) => Promise<void>
}
