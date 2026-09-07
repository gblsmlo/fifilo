import type { AiBudgetRepository, AiKillSwitchRepository, AiRunRepository } from '@fifilo/core/ai'

import { createAiBudgetRepository as createAiBudgetRepositoryPersistence } from './ai-budgets-persistence'
import { createAiKillSwitchRepository as createAiKillSwitchRepositoryPersistence } from './ai-kill-switch-persistence'
import { createAiRunRepository as createAiRunRepositoryPersistence } from './ai-runs-persistence'

/** Composition root only (Decision 003): no SQL or persistence rule lives here. */
export const createAiRunRepository = (): AiRunRepository => createAiRunRepositoryPersistence()

export const createAiBudgetRepository = (): AiBudgetRepository =>
  createAiBudgetRepositoryPersistence()

export const createAiKillSwitchRepository = (): AiKillSwitchRepository =>
  createAiKillSwitchRepositoryPersistence()
