import { describe, expect, test } from 'bun:test'
import { generateEntityId } from '../../primitives'
import { createFakeAiKillSwitchRepository } from './fake-ai-repositories'
import { setWorkspaceKillSwitch } from './set-kill-switch'

const ORGANIZATION_ID = 'org_1'

describe('setWorkspaceKillSwitch', () => {
  test('an owner turns the switch on, and the check reflects it immediately', async () => {
    const repository = createFakeAiKillSwitchRepository()

    const result = await setWorkspaceKillSwitch(
      {
        enabled: true,
        organizationId: ORGANIZATION_ID,
        role: 'owner',
        updatedBy: generateEntityId(),
      },
      repository,
    )

    expect(result).toEqual({ ok: true, value: true })
    expect(await repository.isWorkspaceKilled(ORGANIZATION_ID)).toBe(true)
  })

  test('rejects a member or viewer before touching the repository', async () => {
    const repository = createFakeAiKillSwitchRepository()

    for (const role of ['member', 'viewer'] as const) {
      const result = await setWorkspaceKillSwitch(
        { enabled: true, organizationId: ORGANIZATION_ID, role, updatedBy: generateEntityId() },
        repository,
      )

      expect(result.ok).toBe(false)
      if (!result.ok) expect(result.error.code).toBe('insufficient_role')
    }

    expect(await repository.isWorkspaceKilled(ORGANIZATION_ID)).toBe(false)
  })
})
