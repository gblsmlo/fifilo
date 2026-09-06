import { describe, expect, test } from 'bun:test'

import { buildInstallmentShares } from './installment'

describe('buildInstallmentShares', () => {
  test('splits the total across consecutive months starting at the purchase date', () => {
    const result = buildInstallmentShares({ amountMinor: 10_000, currency: 'BRL' }, 3, '2026-01-15')
    expect(result.ok).toBe(true)
    if (!result.ok) return

    expect(result.value).toEqual([
      { amountMinor: 3334, installmentNumber: 1, occurredOn: '2026-01-15' },
      { amountMinor: 3333, installmentNumber: 2, occurredOn: '2026-02-15' },
      { amountMinor: 3333, installmentNumber: 3, occurredOn: '2026-03-15' },
    ])
  })

  test('clamps a month-end purchase date across shorter months', () => {
    const result = buildInstallmentShares({ amountMinor: 300, currency: 'BRL' }, 3, '2026-01-31')
    expect(result.ok).toBe(true)
    if (!result.ok) return

    expect(result.value.map((share) => share.occurredOn)).toEqual([
      '2026-01-31',
      '2026-02-28',
      '2026-03-31',
    ])
  })

  test('rejects a non-positive number of installments, same as the underlying allocation', () => {
    expect(buildInstallmentShares({ amountMinor: 100, currency: 'BRL' }, 0, '2026-01-01').ok).toBe(
      false,
    )
  })

  /**
   * Property test (Fase 03 § Critério de conclusão): for every total and
   * every installment count in a swept range, the shares always sum back to
   * the total exactly - the whole reason `allocate` exists instead of
   * `total / n` rounded per share.
   */
  test('the shares always sum back to the total, for any total and any part count', () => {
    for (let amountMinor = 0; amountMinor <= 500; amountMinor += 7) {
      for (let parts = 1; parts <= 12; parts += 1) {
        const result = buildInstallmentShares({ amountMinor, currency: 'BRL' }, parts, '2026-05-31')
        expect(result.ok).toBe(true)
        if (!result.ok) continue

        expect(result.value).toHaveLength(parts)
        expect(result.value.reduce((sum, share) => sum + share.amountMinor, 0)).toBe(amountMinor)
        expect(result.value.map((share) => share.installmentNumber)).toEqual(
          Array.from({ length: parts }, (_, index) => index + 1),
        )
      }
    }
  })
})
