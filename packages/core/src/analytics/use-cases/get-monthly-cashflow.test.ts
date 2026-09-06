import { describe, expect, test } from 'bun:test'

import { createFakeAnalyticsReader } from './fake-analytics-reader'
import { getMonthlyCashflow } from './get-monthly-cashflow'

const ORGANIZATION_ID = 'org_1'

describe('getMonthlyCashflow', () => {
  test('returns the reader`s points unchanged', async () => {
    const reader = createFakeAnalyticsReader({
      monthlyCashflow: [{ expenseMinor: 3_000, incomeMinor: 5_000, month: '2026-01' }],
    })

    const result = await getMonthlyCashflow(
      { from: '2026-01-01', organizationId: ORGANIZATION_ID, to: '2026-01-31' },
      reader,
    )

    expect(result).toEqual({
      ok: true,
      value: [{ expenseMinor: 3_000, incomeMinor: 5_000, month: '2026-01' }],
    })
  })

  test('rejects an inverted range before ever reading', async () => {
    const reader = createFakeAnalyticsReader()

    const result = await getMonthlyCashflow(
      { from: '2026-02-01', organizationId: ORGANIZATION_ID, to: '2026-01-01' },
      reader,
    )

    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error.code).toBe('invalid_date_range')
  })
})
