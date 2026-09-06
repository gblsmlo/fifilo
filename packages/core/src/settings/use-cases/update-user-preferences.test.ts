import { describe, expect, test } from 'bun:test'

import { generateEntityId } from '../../primitives'
import { createFakeUserPreferencesRepository } from './fake-settings-repositories'
import { updateUserPreferences } from './update-user-preferences'

describe('updateUserPreferences', () => {
  // No role in `UpdateUserPreferencesCommand`'s own type, and no
  // `requireFinancialWriteAccess`/`requireSettingsWriteAccess` call inside
  // the use case (Fase 06 § Modelagem): a preference is personal, not a
  // financial resource, so even a `viewer` sets their own theme.

  test('creates the row on the first ever change', async () => {
    const userId = generateEntityId()
    const repository = createFakeUserPreferencesRepository()

    const result = await updateUserPreferences(
      { expectedVersion: 0, organizationId: 'org_1', patch: { theme: 'dark' }, userId },
      repository,
    )

    expect(result.ok).toBe(true)
    if (result.ok) expect(result.value.theme).toBe('dark')
  })

  test('a stale version is a conflict', async () => {
    const userId = generateEntityId()
    const repository = createFakeUserPreferencesRepository([
      {
        density: 'comfortable',
        notifyByEmail: true,
        organizationId: 'org_1',
        theme: 'system',
        updatedAt: new Date(),
        userId,
        version: 2,
      },
    ])

    const result = await updateUserPreferences(
      { expectedVersion: 1, organizationId: 'org_1', patch: { theme: 'light' }, userId },
      repository,
    )

    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error.code).toBe('version_conflict')
  })
})
