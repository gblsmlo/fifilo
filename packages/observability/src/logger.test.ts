import { describe, expect, test } from 'bun:test'

import { sanitizeValue } from './logger'

describe('sanitizeValue', () => {
  test.each([
    'authorization',
    'cookie',
    'token',
    'secret',
    'password',
    'credential',
    'sessionId',
    'otp',
    'backupCode',
    'privateKey',
    'apiKey',
    'email',
    'userEmail',
    'phone',
    'phoneNumber',
    'document',
    'address',
  ])('redacts a %s field by key name, regardless of case', (key) => {
    expect(sanitizeValue({ [key]: 'sensitive value' })).toEqual({ [key]: '[redacted]' })
    expect(sanitizeValue({ [key.toUpperCase()]: 'sensitive value' })).toEqual({
      [key.toUpperCase()]: '[redacted]',
    })
  })

  test('does not redact "name" - it is also spanName, an error name, a category or organization name', () => {
    expect(sanitizeValue({ name: 'Mercado' })).toEqual({ name: 'Mercado' })
    expect(sanitizeValue({ spanName: 'http.request' })).toEqual({ spanName: 'http.request' })
  })

  test('redacts nested sensitive keys, not just top-level ones', () => {
    expect(sanitizeValue({ user: { email: 'a@b.com', id: 'user_1' } })).toEqual({
      user: { email: '[redacted]', id: 'user_1' },
    })
  })

  test('redacts sensitive keys inside array elements', () => {
    expect(sanitizeValue([{ email: 'a@b.com' }, { id: 'user_1' }])).toEqual([
      { email: '[redacted]' },
      { id: 'user_1' },
    ])
  })

  test('extracts only message and name from an Error, never its stack', () => {
    const error = new TypeError('boom')
    expect(sanitizeValue({ error })).toEqual({ error: { message: 'boom', name: 'TypeError' } })
  })

  test('leaves a non-sensitive value untouched', () => {
    expect(sanitizeValue({ amountMinor: 5_000, currency: 'BRL' })).toEqual({
      amountMinor: 5_000,
      currency: 'BRL',
    })
  })
})
