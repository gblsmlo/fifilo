import { describe, expect, test } from 'bun:test'

import { generateEntityId } from '../../primitives'
import { createFakeAnalyticsReader } from './fake-analytics-reader'
import { getTopExpenses } from './get-top-expenses'

const ORGANIZATION_ID = 'org_1'

describe('getTopExpenses', () => {
  test('returns the reader`s rows unchanged', async () => {
    const transactionId = generateEntityId()
    const reader = createFakeAnalyticsReader({
      topExpenses: [
        {
          amountMinor: 50_000,
          categoryName: 'Viagem',
          description: 'Passagem aérea',
          occurredOn: '2026-01-10',
          transactionId,
        },
      ],
    })

    const result = await getTopExpenses(
      { from: '2026-01-01', limit: 5, organizationId: ORGANIZATION_ID, to: '2026-01-31' },
      reader,
    )

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.value).toHaveLength(1)
    expect(result.value[0]?.transactionId).toBe(transactionId)
  })

  test('rejects an inverted range', async () => {
    const reader = createFakeAnalyticsReader()

    const result = await getTopExpenses(
      { from: '2026-02-01', limit: 5, organizationId: ORGANIZATION_ID, to: '2026-01-01' },
      reader,
    )

    expect(result.ok).toBe(false)
  })
})
