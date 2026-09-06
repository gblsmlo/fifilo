import { afterEach, describe, expect, test } from 'bun:test'

import { resolveThisMonthRange } from './resolve-this-month'

describe('resolveThisMonthRange', () => {
  const originalTz = process.env.TZ

  afterEach(() => {
    process.env.TZ = originalTz
  })

  test('resolves the workspace month even when its local clock already rolled into the next month', () => {
    // 2026-02-01T02:30Z is still 2026-01-31 23:30 in America/Sao_Paulo (UTC-3).
    const now = new Date('2026-02-01T02:30:00.000Z')

    expect(resolveThisMonthRange(now, 'America/Sao_Paulo')).toEqual({
      from: '2026-01-01',
      to: '2026-01-31',
    })
  })

  test('is unaffected by the runner`s own local timezone (Decision 018)', () => {
    const now = new Date('2026-02-01T02:30:00.000Z')

    process.env.TZ = 'Pacific/Kiritimati' // UTC+14 - the runner's own "today" is already Feb 1st here.
    const shiftedRunner = resolveThisMonthRange(now, 'America/Sao_Paulo')

    process.env.TZ = 'UTC'
    const utcRunner = resolveThisMonthRange(now, 'America/Sao_Paulo')

    expect(shiftedRunner).toEqual(utcRunner)
    expect(shiftedRunner).toEqual({ from: '2026-01-01', to: '2026-01-31' })
  })

  test('resolves a 30-day month and a leap February', () => {
    expect(
      resolveThisMonthRange(new Date('2026-04-15T12:00:00.000Z'), 'America/Sao_Paulo').to,
    ).toBe('2026-04-30')
    expect(
      resolveThisMonthRange(new Date('2028-02-15T12:00:00.000Z'), 'America/Sao_Paulo').to,
    ).toBe('2028-02-29')
  })

  test('defaults to the workspace timezone when none is given', () => {
    const now = new Date('2026-02-01T02:30:00.000Z')

    expect(resolveThisMonthRange(now)).toEqual({ from: '2026-01-01', to: '2026-01-31' })
  })
})
