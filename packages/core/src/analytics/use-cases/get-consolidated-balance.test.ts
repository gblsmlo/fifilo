import { describe, expect, test } from 'bun:test'

import { createFakeAnalyticsReader } from './fake-analytics-reader'
import { getConsolidatedBalance } from './get-consolidated-balance'

describe('getConsolidatedBalance', () => {
  test('nets available cash against what is committed in open invoices', async () => {
    const reader = createFakeAnalyticsReader({
      consolidatedBalance: { availableCashMinor: 100_000, committedInvoiceMinor: 30_000 },
    })

    const result = await getConsolidatedBalance(
      { asOf: '2026-06-30', organizationId: 'org_1' },
      reader,
    )

    expect(result).toEqual({
      ok: true,
      value: { availableCashMinor: 100_000, committedInvoiceMinor: 30_000, netMinor: 70_000 },
    })
  })

  test('a negative net is reported as-is - more committed than available is a real state', async () => {
    const reader = createFakeAnalyticsReader({
      consolidatedBalance: { availableCashMinor: 10_000, committedInvoiceMinor: 30_000 },
    })

    const result = await getConsolidatedBalance(
      { asOf: '2026-06-30', organizationId: 'org_1' },
      reader,
    )

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.value.netMinor).toBe(-20_000)
  })
})
