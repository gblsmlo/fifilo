import { describe, expect, test } from 'bun:test'

import { errorCodeToSurfaceKind } from './state-kinds'

describe('errorCodeToSurfaceKind', () => {
  test('permission codes map to permission, not generic error', () => {
    expect(errorCodeToSurfaceKind('permission_denied')).toBe('permission')
    expect(errorCodeToSurfaceKind('forbidden')).toBe('permission')
    expect(errorCodeToSurfaceKind('unauthorized')).toBe('permission')
  })

  test('unknown codes map to recoverable error', () => {
    expect(errorCodeToSurfaceKind('lead_not_found')).toBe('error')
    expect(errorCodeToSurfaceKind('validation_failed')).toBe('error')
  })

  test('undefined code defaults to error', () => {
    expect(errorCodeToSurfaceKind(undefined)).toBe('error')
  })
})
