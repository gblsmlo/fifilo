import { describe, expect, test } from 'bun:test'

import { generateEntityId } from '../../primitives'
import { createFakeAnalyticsReader } from './fake-analytics-reader'
import { getSpendByAccount } from './get-spend-by-account'

const ORGANIZATION_ID = 'org_1'

describe('getSpendByAccount', () => {
  test('returns cash and card rows together, told apart by kind', async () => {
    const checkingId = generateEntityId()
    const cardId = generateEntityId()
    const reader = createFakeAnalyticsReader({
      spendByAccount: [
        {
          accountId: checkingId,
          accountName: 'Conta corrente',
          kind: 'checking',
          totalMinor: 4_000,
        },
        { accountId: cardId, accountName: 'Cartão', kind: 'credit_card', totalMinor: 6_000 },
      ],
    })

    const result = await getSpendByAccount(
      { from: '2026-01-01', organizationId: ORGANIZATION_ID, to: '2026-01-31' },
      reader,
    )

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.value.map((row) => row.kind)).toEqual(['checking', 'credit_card'])
  })

  test('rejects an inverted range', async () => {
    const reader = createFakeAnalyticsReader()

    const result = await getSpendByAccount(
      { from: '2026-02-01', organizationId: ORGANIZATION_ID, to: '2026-01-01' },
      reader,
    )

    expect(result.ok).toBe(false)
  })
})
