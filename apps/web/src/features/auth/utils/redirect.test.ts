import { describe, expect, test } from 'bun:test'

import { decodeAuthRedirect, encodeAuthRedirect } from './redirect'

describe('auth redirect helpers', () => {
  test('encodes internal paths without the leading slash', () => {
    expect(encodeAuthRedirect('/dashboard')).toBe('dashboard')
    expect(encodeAuthRedirect('/login?email=test@example.com')).toBe('login?email=test@example.com')
  })

  test('decodes redirect values back to internal paths', () => {
    expect(decodeAuthRedirect('dashboard')).toBe('/dashboard')
    expect(decodeAuthRedirect('/dashboard')).toBe('/dashboard')
    expect(decodeAuthRedirect('https://example.com/dashboard')).toBe('/dashboard')
  })
})
