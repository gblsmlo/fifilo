import { describe, expect, test } from 'bun:test'

import { generateEntityId } from '../../primitives'
import { createFakeAnalyticsReader } from './fake-analytics-reader'
import { getSpendByCategory } from './get-spend-by-category'

const ORGANIZATION_ID = 'org_1'

describe('getSpendByCategory', () => {
  test('computes each category`s percentage of the period`s total', async () => {
    const groceries = generateEntityId()
    const transport = generateEntityId()
    const reader = createFakeAnalyticsReader({
      spendByCategory: [
        { categoryId: groceries, categoryName: 'Mercado', parentId: null, totalMinor: 7_500 },
        { categoryId: transport, categoryName: 'Transporte', parentId: null, totalMinor: 2_500 },
      ],
    })

    const result = await getSpendByCategory(
      { from: '2026-01-01', kind: 'expense', organizationId: ORGANIZATION_ID, to: '2026-01-31' },
      reader,
    )

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.value).toEqual([
      {
        categoryId: groceries,
        categoryName: 'Mercado',
        parentId: null,
        percentage: 75,
        totalMinor: 7_500,
      },
      {
        categoryId: transport,
        categoryName: 'Transporte',
        parentId: null,
        percentage: 25,
        totalMinor: 2_500,
      },
    ])
  })

  test('a period with no spend at all reports zero percentage, not NaN', async () => {
    const reader = createFakeAnalyticsReader({ spendByCategory: [] })

    const result = await getSpendByCategory(
      { from: '2026-01-01', kind: 'expense', organizationId: ORGANIZATION_ID, to: '2026-01-31' },
      reader,
    )

    expect(result).toEqual({ ok: true, value: [] })
  })

  test('rejects an inverted range', async () => {
    const reader = createFakeAnalyticsReader()

    const result = await getSpendByCategory(
      { from: '2026-02-01', kind: 'expense', organizationId: ORGANIZATION_ID, to: '2026-01-01' },
      reader,
    )

    expect(result.ok).toBe(false)
  })
})
