import { describe, expect, test } from 'bun:test'
import { generateEntityId } from '../../primitives'
import { cashflowByMonthTool } from './cashflow-by-month'
import { createFakeAssistantToolkit } from './fake-toolkit'
import type { ToolExecutionContext } from './types'

const context: ToolExecutionContext = {
  organizationId: 'org_1',
  role: 'viewer',
  today: '2026-09-15',
  userId: generateEntityId(),
}

describe('cashflowByMonthTool', () => {
  test('returns the reader`s points unchanged', async () => {
    const toolkit = createFakeAssistantToolkit({
      analytics: {
        monthlyCashflow: [{ expenseMinor: 3_000, incomeMinor: 5_000, month: '2026-09' }],
      },
    })

    const result = await cashflowByMonthTool.execute(
      { from: '2026-09-01', to: '2026-09-30' },
      context,
      toolkit,
    )

    expect(result).toEqual({
      ok: true,
      value: [{ expenseMinor: 3_000, incomeMinor: 5_000, month: '2026-09' }],
    })
  })

  test('rejects an inverted range before ever reading', async () => {
    const toolkit = createFakeAssistantToolkit()

    const result = await cashflowByMonthTool.execute(
      { from: '2026-10-01', to: '2026-09-01' },
      context,
      toolkit,
    )

    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error.code).toBe('invalid_date_range')
  })
})
