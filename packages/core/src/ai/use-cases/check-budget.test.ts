import { describe, expect, test } from 'bun:test'

import { checkBudget } from './check-budget'
import { createFakeAiBudgetRepository } from './fake-ai-repositories'

const ORGANIZATION_ID = 'org_1'

describe('checkBudget', () => {
  test('allows a period with no budget row - unlimited is the default', async () => {
    const result = await checkBudget(
      { organizationId: ORGANIZATION_ID, period: '2026-09' },
      createFakeAiBudgetRepository(),
    )

    expect(result).toEqual({ ok: true, value: true })
  })

  test('allows a period whose limit was explicitly left unset', async () => {
    const repository = createFakeAiBudgetRepository()
    await repository.setLimit(ORGANIZATION_ID, '2026-09', { currency: 'BRL', limitMinor: null }, 0)

    const result = await checkBudget(
      { organizationId: ORGANIZATION_ID, period: '2026-09' },
      repository,
    )

    expect(result).toEqual({ ok: true, value: true })
  })

  test('allows a period under its limit', async () => {
    const repository = createFakeAiBudgetRepository()
    await repository.setLimit(
      ORGANIZATION_ID,
      '2026-09',
      { currency: 'BRL', limitMinor: 10_000 },
      0,
    )
    await repository.recordSpend(ORGANIZATION_ID, '2026-09', 5_000)

    const result = await checkBudget(
      { organizationId: ORGANIZATION_ID, period: '2026-09' },
      repository,
    )

    expect(result).toEqual({ ok: true, value: true })
  })

  test('refuses a period at or over its limit', async () => {
    const repository = createFakeAiBudgetRepository()
    await repository.setLimit(
      ORGANIZATION_ID,
      '2026-09',
      { currency: 'BRL', limitMinor: 10_000 },
      0,
    )
    await repository.recordSpend(ORGANIZATION_ID, '2026-09', 10_000)

    const result = await checkBudget(
      { organizationId: ORGANIZATION_ID, period: '2026-09' },
      repository,
    )

    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error.code).toBe('ai_budget_exceeded')
  })

  test('another organization`s budget never affects this one`s check', async () => {
    const repository = createFakeAiBudgetRepository()
    await repository.setLimit('org_other', '2026-09', { currency: 'BRL', limitMinor: 100 }, 0)
    await repository.recordSpend('org_other', '2026-09', 100)

    const result = await checkBudget(
      { organizationId: ORGANIZATION_ID, period: '2026-09' },
      repository,
    )

    expect(result).toEqual({ ok: true, value: true })
  })
})
