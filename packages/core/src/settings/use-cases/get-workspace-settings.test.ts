import { describe, expect, test } from 'bun:test'

import { createFakeWorkspaceSettingsRepository } from './fake-settings-repositories'
import { getWorkspaceSettings } from './get-workspace-settings'

describe('getWorkspaceSettings', () => {
  test('a workspace that never opened Settings resolves the defaults, not null', async () => {
    const repository = createFakeWorkspaceSettingsRepository()

    const result = await getWorkspaceSettings({ organizationId: 'org_1' }, repository)

    expect(result).toEqual({
      ok: true,
      value: {
        currency: 'BRL',
        locale: 'pt-BR',
        monthStartDay: 1,
        organizationId: 'org_1',
        timezone: 'America/Sao_Paulo',
        updatedAt: null,
        version: 0,
        weekStartsOn: 'monday',
      },
    })
  })

  test('a persisted row wins over the defaults', async () => {
    const repository = createFakeWorkspaceSettingsRepository([
      {
        currency: 'USD',
        locale: 'en-US',
        monthStartDay: 5,
        organizationId: 'org_1',
        timezone: 'America/New_York',
        updatedAt: new Date('2026-01-01'),
        version: 3,
        weekStartsOn: 'sunday',
      },
    ])

    const result = await getWorkspaceSettings({ organizationId: 'org_1' }, repository)

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.value.currency).toBe('USD')
    expect(result.value.monthStartDay).toBe(5)
    expect(result.value.version).toBe(3)
  })
})
