import { describe, expect, test } from 'bun:test'

import { generateEntityId } from '../../primitives'
import { createFakeAnalyticsReader } from './fake-analytics-reader'
import { getBalanceEvolution } from './get-balance-evolution'

const ORGANIZATION_ID = 'org_1'

describe('getBalanceEvolution', () => {
  test('returns per-account series and the consolidated series unchanged', async () => {
    const accountId = generateEntityId()
    const reader = createFakeAnalyticsReader({
      balanceEvolution: {
        accounts: [{ accountId, points: [{ balanceMinor: 1_000, date: '2026-01-01' }] }],
        consolidated: [{ balanceMinor: 1_000, date: '2026-01-01' }],
      },
    })

    const result = await getBalanceEvolution(
      { from: '2026-01-01', organizationId: ORGANIZATION_ID, to: '2026-01-31' },
      reader,
    )

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.value.accounts).toEqual([
      { accountId, points: [{ balanceMinor: 1_000, date: '2026-01-01' }] },
    ])
    expect(result.value.consolidated).toEqual([{ balanceMinor: 1_000, date: '2026-01-01' }])
  })

  test('rejects an inverted range before ever reading', async () => {
    const reader = createFakeAnalyticsReader()

    const result = await getBalanceEvolution(
      { from: '2026-02-01', organizationId: ORGANIZATION_ID, to: '2026-01-01' },
      reader,
    )

    expect(result.ok).toBe(false)
  })
})
