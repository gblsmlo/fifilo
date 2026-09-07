import { describe, expect, test } from 'bun:test'

import { checkKillSwitch } from './check-kill-switch'
import { createFakeAiKillSwitchRepository } from './fake-ai-repositories'

const ORGANIZATION_ID = 'org_1'

describe('checkKillSwitch', () => {
  test('allows a run when nothing is killed', async () => {
    const result = await checkKillSwitch(
      { organizationId: ORGANIZATION_ID },
      createFakeAiKillSwitchRepository(),
    )

    expect(result).toEqual({ ok: true, value: true })
  })

  test('refuses when the workspace itself is killed', async () => {
    const repository = createFakeAiKillSwitchRepository({ workspaces: new Set([ORGANIZATION_ID]) })

    const result = await checkKillSwitch({ organizationId: ORGANIZATION_ID }, repository)

    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error.code).toBe('ai_disabled_for_workspace')
  })

  test('refuses every workspace when the global switch is killed', async () => {
    const repository = createFakeAiKillSwitchRepository({ global: true })

    const result = await checkKillSwitch({ organizationId: ORGANIZATION_ID }, repository)

    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error.code).toBe('ai_disabled_globally')
  })

  test('another workspace being killed never affects this one', async () => {
    const repository = createFakeAiKillSwitchRepository({ workspaces: new Set(['org_other']) })

    const result = await checkKillSwitch({ organizationId: ORGANIZATION_ID }, repository)

    expect(result).toEqual({ ok: true, value: true })
  })

  test('the product keeps working once the switch is off again', async () => {
    const repository = createFakeAiKillSwitchRepository({ workspaces: new Set([ORGANIZATION_ID]) })
    expect((await checkKillSwitch({ organizationId: ORGANIZATION_ID }, repository)).ok).toBe(false)

    await repository.setWorkspace(ORGANIZATION_ID, false, null)

    expect((await checkKillSwitch({ organizationId: ORGANIZATION_ID }, repository)).ok).toBe(true)
  })
})
