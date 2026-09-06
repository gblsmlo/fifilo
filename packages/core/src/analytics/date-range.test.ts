import { describe, expect, test } from 'bun:test'

import { validateDateRange } from './date-range'

describe('validateDateRange', () => {
  test('accepts a range where from is before to', () => {
    expect(validateDateRange('2026-01-01', '2026-01-31')).toEqual({ ok: true, value: true })
  })

  test('accepts a single-day range', () => {
    expect(validateDateRange('2026-01-01', '2026-01-01')).toEqual({ ok: true, value: true })
  })

  test('rejects a range where from is after to', () => {
    const result = validateDateRange('2026-02-01', '2026-01-01')
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error.code).toBe('invalid_date_range')
  })
})
