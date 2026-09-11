import { describe, expect, test } from 'bun:test'
import { generateEntityId } from '../../primitives'
import { createFakeAssistantToolkit } from './fake-toolkit'
import { topExpensesTool } from './top-expenses'
import type { ToolExecutionContext } from './types'

const context: ToolExecutionContext = {
  organizationId: 'org_1',
  role: 'viewer',
  today: '2026-09-15',
  userId: generateEntityId(),
}

describe('topExpensesTool', () => {
  test('returns the N largest expenses', async () => {
    const transactionId = generateEntityId()
    const toolkit = createFakeAssistantToolkit({
      analytics: {
        topExpenses: [
          {
            amountMinor: 50_000,
            categoryName: 'Viagem',
            description: 'Passagem aérea',
            occurredOn: '2026-09-10',
            transactionId,
          },
        ],
      },
    })

    const result = await topExpensesTool.execute(
      { from: '2026-09-01', limit: 5, to: '2026-09-30' },
      context,
      toolkit,
    )

    expect(result.ok).toBe(true)
    if (result.ok) expect(result.value).toHaveLength(1)
  })
})
