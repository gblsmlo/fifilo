import { describe, expect, test } from 'bun:test'

import {
  createFakeWorkspaceAccountsLookup,
  createFakeWorkspaceSettingsRepository,
} from './fake-settings-repositories'
import { updateWorkspaceSettings } from './update-workspace-settings'

describe('updateWorkspaceSettings', () => {
  test('creates the row on the first ever change, expectedVersion 0', async () => {
    const repository = createFakeWorkspaceSettingsRepository()
    const accounts = createFakeWorkspaceAccountsLookup()

    const result = await updateWorkspaceSettings(
      {
        expectedVersion: 0,
        organizationId: 'org_1',
        patch: { timezone: 'America/Recife' },
        role: 'owner',
      },
      repository,
      accounts,
    )

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.value.timezone).toBe('America/Recife')
    expect(result.value.version).toBe(1)
  })

  test('rejects member and viewer - settings are narrower than the financial matrix', async () => {
    const repository = createFakeWorkspaceSettingsRepository()
    const accounts = createFakeWorkspaceAccountsLookup()

    for (const role of ['member', 'viewer'] as const) {
      const result = await updateWorkspaceSettings(
        { expectedVersion: 0, organizationId: 'org_1', patch: { locale: 'en-US' }, role },
        repository,
        accounts,
      )
      expect(result.ok).toBe(false)
      if (!result.ok) expect(result.error.code).toBe('insufficient_role')
    }
  })

  test('rejects an out-of-range month start day', async () => {
    const repository = createFakeWorkspaceSettingsRepository()
    const accounts = createFakeWorkspaceAccountsLookup()

    const result = await updateWorkspaceSettings(
      { expectedVersion: 0, organizationId: 'org_1', patch: { monthStartDay: 29 }, role: 'owner' },
      repository,
      accounts,
    )

    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error.code).toBe('invalid_month_start_day')
  })

  test('changing currency once an account exists is a conflict', async () => {
    const repository = createFakeWorkspaceSettingsRepository()
    const accounts = createFakeWorkspaceAccountsLookup(['org_1'])

    const result = await updateWorkspaceSettings(
      { expectedVersion: 0, organizationId: 'org_1', patch: { currency: 'USD' }, role: 'owner' },
      repository,
      accounts,
    )

    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error.code).toBe('currency_locked')
  })

  test('changing currency before any account exists is allowed', async () => {
    const repository = createFakeWorkspaceSettingsRepository()
    const accounts = createFakeWorkspaceAccountsLookup()

    const result = await updateWorkspaceSettings(
      { expectedVersion: 0, organizationId: 'org_1', patch: { currency: 'USD' }, role: 'owner' },
      repository,
      accounts,
    )

    expect(result.ok).toBe(true)
    if (result.ok) expect(result.value.currency).toBe('USD')
  })

  test('a stale version is a conflict', async () => {
    const repository = createFakeWorkspaceSettingsRepository([
      {
        currency: 'BRL',
        locale: 'pt-BR',
        monthStartDay: 1,
        organizationId: 'org_1',
        timezone: 'America/Sao_Paulo',
        updatedAt: new Date(),
        version: 2,
        weekStartsOn: 'monday',
      },
    ])
    const accounts = createFakeWorkspaceAccountsLookup()

    const result = await updateWorkspaceSettings(
      { expectedVersion: 1, organizationId: 'org_1', patch: { locale: 'en-US' }, role: 'owner' },
      repository,
      accounts,
    )

    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error.code).toBe('version_conflict')
  })
})
