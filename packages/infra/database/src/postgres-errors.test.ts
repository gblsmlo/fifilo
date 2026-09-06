import { describe, expect, test } from 'bun:test'

import { isUniqueViolation } from './postgres-errors'

describe('isUniqueViolation', () => {
  test('recognizes the SQLSTATE on a raw driver-shaped error', () => {
    expect(isUniqueViolation({ errno: '23505' })).toBe(true)
  })

  /**
   * The shape that actually reaches a caller through Drizzle: a
   * `DrizzleQueryError` with the driver's error underneath `.cause`. A check
   * against the top-level object alone never matches this - the exact bug
   * this test exists to pin down.
   */
  test('recognizes the SQLSTATE wrapped in DrizzleQueryError`s .cause', () => {
    const wrapped = { cause: { errno: '23505' }, query: 'insert ...' }
    expect(isUniqueViolation(wrapped)).toBe(true)
  })

  test('does not match a different SQLSTATE', () => {
    expect(isUniqueViolation({ errno: '42501' })).toBe(false)
    expect(isUniqueViolation({ cause: { errno: '42501' } })).toBe(false)
  })

  test('does not match a non-Postgres error', () => {
    expect(isUniqueViolation(new Error('boom'))).toBe(false)
    expect(isUniqueViolation(null)).toBe(false)
    expect(isUniqueViolation(undefined)).toBe(false)
  })
})
