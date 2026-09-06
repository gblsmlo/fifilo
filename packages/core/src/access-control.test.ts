import { describe, expect, test } from 'bun:test'

import { requireFinancialWriteAccess, toWorkspaceRole } from './access-control'

describe('requireFinancialWriteAccess', () => {
  test.each(['owner', 'admin', 'member'] as const)('allows %s to write', (role) => {
    expect(requireFinancialWriteAccess(role)).toEqual({ ok: true, value: true })
  })

  test('rejects viewer with a forbidden error', () => {
    const result = requireFinancialWriteAccess('viewer')
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error.code).toBe('insufficient_role')
  })
})

describe('toWorkspaceRole', () => {
  test.each(['owner', 'admin', 'member', 'viewer'] as const)('keeps a known role %s', (role) => {
    expect(toWorkspaceRole(role)).toBe(role)
  })

  test('fails closed to viewer for anything `members.role` has never actually held', () => {
    expect(toWorkspaceRole('superadmin')).toBe('viewer')
    expect(toWorkspaceRole('')).toBe('viewer')
  })
})
