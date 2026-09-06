import { describe, expect, test } from 'bun:test'

import { generateEntityId } from '../../primitives'
import { createFakeUserPreferencesRepository } from './fake-settings-repositories'
import { getUserPreferences } from './get-user-preferences'

describe('getUserPreferences', () => {
  test('a user who never opened preferences resolves the defaults', async () => {
    const userId = generateEntityId()
    const repository = createFakeUserPreferencesRepository()

    const result = await getUserPreferences({ organizationId: 'org_1', userId }, repository)

    expect(result).toEqual({
      ok: true,
      value: {
        density: 'comfortable',
        notifyByEmail: true,
        organizationId: 'org_1',
        theme: 'system',
        updatedAt: null,
        userId,
        version: 0,
      },
    })
  })

  test('the same user has independent preferences per workspace', async () => {
    const userId = generateEntityId()
    const repository = createFakeUserPreferencesRepository([
      {
        density: 'compact',
        notifyByEmail: false,
        organizationId: 'org_1',
        theme: 'dark',
        updatedAt: new Date(),
        userId,
        version: 1,
      },
    ])

    const inOrgOne = await getUserPreferences({ organizationId: 'org_1', userId }, repository)
    const inOrgTwo = await getUserPreferences({ organizationId: 'org_2', userId }, repository)

    expect(inOrgOne.ok && inOrgOne.value.theme).toBe('dark')
    expect(inOrgTwo.ok && inOrgTwo.value.theme).toBe('system')
  })
})
