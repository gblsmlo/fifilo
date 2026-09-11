import { describe, expect, test } from 'bun:test'
import { generateEntityId } from '../../primitives'
import { createFakeAssistantToolkit } from './fake-toolkit'
import { spendByCategoryTool } from './spend-by-category'
import type { ToolExecutionContext } from './types'

const context: ToolExecutionContext = {
  organizationId: 'org_1',
  role: 'viewer',
  today: '2026-09-15',
  userId: generateEntityId(),
}

describe('spendByCategoryTool', () => {
  test('reports each category`s share of the period', async () => {
    const categoryId = generateEntityId()
    const toolkit = createFakeAssistantToolkit({
      analytics: {
        spendByCategory: [
          { categoryId, categoryName: 'Mercado', parentId: null, totalMinor: 10_000 },
        ],
      },
    })

    const result = await spendByCategoryTool.execute(
      { from: '2026-09-01', kind: 'expense', to: '2026-09-30' },
      context,
      toolkit,
    )

    expect(result).toEqual({
      ok: true,
      value: [
        {
          categoryId,
          categoryName: 'Mercado',
          parentId: null,
          percentage: 100,
          totalMinor: 10_000,
        },
      ],
    })
  })
})
