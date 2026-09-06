import { afterEach, describe, expect, test } from 'bun:test'

import { workspaceToday } from './workspace-today'

describe('workspaceToday', () => {
  const originalTz = process.env.TZ

  afterEach(() => {
    process.env.TZ = originalTz
  })

  test('resolves the workspace civil date even when its local clock already rolled into the next day', () => {
    // 2026-02-01T02:30Z is still 2026-01-31 23:30 in America/Sao_Paulo (UTC-3).
    const now = new Date('2026-02-01T02:30:00.000Z')

    expect(workspaceToday(now, 'America/Sao_Paulo')).toBe('2026-01-31')
  })

  test('is unaffected by the runner`s own local timezone (Decision 018)', () => {
    const now = new Date('2026-02-01T02:30:00.000Z')

    process.env.TZ = 'Pacific/Kiritimati' // UTC+14 - the runner's own "today" is already Feb 1st here.
    const shiftedRunner = workspaceToday(now, 'America/Sao_Paulo')

    process.env.TZ = 'UTC'
    const utcRunner = workspaceToday(now, 'America/Sao_Paulo')

    expect(shiftedRunner).toBe(utcRunner)
    expect(shiftedRunner).toBe('2026-01-31')
  })

  test('defaults to the workspace timezone when none is given', () => {
    const now = new Date('2026-02-01T02:30:00.000Z')

    expect(workspaceToday(now)).toBe('2026-01-31')
  })
})
