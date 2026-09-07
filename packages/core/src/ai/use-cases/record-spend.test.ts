import { describe, expect, test } from 'bun:test'

import { checkBudget } from './check-budget'
import { createFakeAiBudgetRepository } from './fake-ai-repositories'
import { recordSpend } from './record-spend'

const ORGANIZATION_ID = 'org_1'

describe('recordSpend', () => {
  test('creates the period`s row on its first spend', async () => {
    const repository = createFakeAiBudgetRepository()

    const budget = await recordSpend(
      { amountMinor: 3_000, organizationId: ORGANIZATION_ID, period: '2026-09' },
      repository,
    )

    expect(budget.consumedMinor).toBe(3_000)
    expect(budget.limitMinor).toBeNull()
  })

  test('accumulates across multiple runs in the same period', async () => {
    const repository = createFakeAiBudgetRepository()
    await recordSpend(
      { amountMinor: 3_000, organizationId: ORGANIZATION_ID, period: '2026-09' },
      repository,
    )
    const budget = await recordSpend(
      { amountMinor: 2_000, organizationId: ORGANIZATION_ID, period: '2026-09' },
      repository,
    )

    expect(budget.consumedMinor).toBe(5_000)
  })

  test('still records spend past the limit - a limit blocks the next check, not the recording of an already-incurred cost', async () => {
    const repository = createFakeAiBudgetRepository()
    await repository.setLimit(ORGANIZATION_ID, '2026-09', { currency: 'BRL', limitMinor: 1_000 }, 0)

    const budget = await recordSpend(
      { amountMinor: 5_000, organizationId: ORGANIZATION_ID, period: '2026-09' },
      repository,
    )

    expect(budget.consumedMinor).toBe(5_000)
    const result = await checkBudget(
      { organizationId: ORGANIZATION_ID, period: '2026-09' },
      repository,
    )
    expect(result.ok).toBe(false)
  })
})
