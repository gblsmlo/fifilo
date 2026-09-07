import { describe, expect, test } from 'bun:test'

import { createFakeAiBudgetRepository, createFakeAiKillSwitchRepository } from './ai-test-support'
import { guardAiRun } from './guard-run'

const ORGANIZATION_ID = 'org_1'
const PERIOD = '2026-09'

describe('guardAiRun', () => {
  test('allows a run when nothing is killed and nothing is over budget', async () => {
    const result = await guardAiRun(
      { organizationId: ORGANIZATION_ID, period: PERIOD },
      createFakeAiKillSwitchRepository(),
      createFakeAiBudgetRepository(),
    )

    expect(result).toEqual({ ok: true, value: true })
  })

  test('refuses on the kill switch before ever checking the budget', async () => {
    const budgetRepository = createFakeAiBudgetRepository()
    let budgetChecked = false
    const spyingBudgetRepository = {
      ...budgetRepository,
      async findByPeriod(organizationId: string, period: string) {
        budgetChecked = true
        return budgetRepository.findByPeriod(organizationId, period)
      },
    }

    const result = await guardAiRun(
      { organizationId: ORGANIZATION_ID, period: PERIOD },
      createFakeAiKillSwitchRepository({ global: true }),
      spyingBudgetRepository,
    )

    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error.code).toBe('ai_disabled_globally')
    expect(budgetChecked).toBe(false)
  })

  test('refuses on an exhausted budget once the kill switch allows it', async () => {
    const budgetRepository = createFakeAiBudgetRepository()
    await budgetRepository.setLimit(
      ORGANIZATION_ID,
      PERIOD,
      { currency: 'BRL', limitMinor: 1_000 },
      0,
    )
    await budgetRepository.recordSpend(ORGANIZATION_ID, PERIOD, 1_000)

    const result = await guardAiRun(
      { organizationId: ORGANIZATION_ID, period: PERIOD },
      createFakeAiKillSwitchRepository(),
      budgetRepository,
    )

    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error.code).toBe('ai_budget_exceeded')
  })
})
