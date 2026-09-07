import { describe, expect, test } from 'bun:test'

import { createFakeAiBudgetRepository } from './fake-ai-repositories'
import { setBudgetLimit } from './set-budget-limit'

const ORGANIZATION_ID = 'org_1'

describe('setBudgetLimit', () => {
  test('an owner creates the period`s limit', async () => {
    const result = await setBudgetLimit(
      {
        expectedVersion: 0,
        organizationId: ORGANIZATION_ID,
        patch: { currency: 'BRL', limitMinor: 50_000 },
        period: '2026-09',
        role: 'owner',
      },
      createFakeAiBudgetRepository(),
    )

    expect(result.ok).toBe(true)
    if (result.ok) expect(result.value.limitMinor).toBe(50_000)
  })

  test('rejects a member or viewer before touching the repository', async () => {
    for (const role of ['member', 'viewer'] as const) {
      const result = await setBudgetLimit(
        {
          expectedVersion: 0,
          organizationId: ORGANIZATION_ID,
          patch: { currency: 'BRL', limitMinor: 50_000 },
          period: '2026-09',
          role,
        },
        createFakeAiBudgetRepository(),
      )

      expect(result.ok).toBe(false)
      if (!result.ok) expect(result.error.code).toBe('insufficient_role')
    }
  })

  test('reports a stale version as a conflict', async () => {
    const repository = createFakeAiBudgetRepository()
    await setBudgetLimit(
      {
        expectedVersion: 0,
        organizationId: ORGANIZATION_ID,
        patch: { currency: 'BRL', limitMinor: 50_000 },
        period: '2026-09',
        role: 'owner',
      },
      repository,
    )

    const result = await setBudgetLimit(
      {
        expectedVersion: 0,
        organizationId: ORGANIZATION_ID,
        patch: { currency: 'BRL', limitMinor: 90_000 },
        period: '2026-09',
        role: 'owner',
      },
      repository,
    )

    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error.code).toBe('version_conflict')
  })
})
