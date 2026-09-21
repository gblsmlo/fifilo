import { describe, expect, test } from 'bun:test'

import type { WorkspaceRole } from '../access-control'
import type { FinancialOnboardingProgress, FinancialOnboardingProgressRepository } from './ports'
import {
  dismissFinancialOnboarding,
  getFinancialOnboardingStatus,
  startFinancialOnboarding,
} from './use-cases'

const progress = (dismissedAt: Date | null = null): FinancialOnboardingProgress => ({
  dismissedAt,
  organizationId: 'org_1',
  userId: 'user_1',
})

const repository = (
  current: FinancialOnboardingProgress | null = progress(),
): FinancialOnboardingProgressRepository & { dismissed: number; ensured: number } => {
  const state = { current, dismissed: 0, ensured: 0 }
  return {
    get dismissed() {
      return state.dismissed
    },
    get ensured() {
      return state.ensured
    },
    async findByUser() {
      return state.current
    },
    async dismiss() {
      state.dismissed += 1
      if (state.current) state.current = { ...state.current, dismissedAt: new Date() }
    },
    async ensure(organizationId, userId) {
      state.ensured += 1
      state.current ??= { dismissedAt: null, organizationId, userId }
    },
  }
}

const status = async (
  role: WorkspaceRole,
  settingsConfigured: boolean,
  accountCreated: boolean,
  progressRow: FinancialOnboardingProgress | null = progress(),
) =>
  getFinancialOnboardingStatus(
    {
      accountCreated,
      organizationId: 'org_1',
      role,
      settingsConfigured,
      userId: 'user_1',
    },
    {
      async findByUser() {
        return progressRow
      },
    },
  )

describe('financial onboarding', () => {
  test('returns an eligible pending status', async () => {
    const result = await status('owner', false, false)

    expect(result).toEqual({
      organizationId: 'org_1',
      eligible: true,
      dismissed: false,
      complete: false,
      reminderVisible: false,
      steps: { workspaceSettings: false, firstAccount: false },
    })
  })

  test('derives completion from settings and the first account', async () => {
    const result = await status('owner', true, true)

    expect(result.complete).toBe(true)
    expect(result.steps).toEqual({ workspaceSettings: true, firstAccount: true })
  })

  test('shows the reminder only after dismissal', async () => {
    const result = await status('owner', false, false, progress(new Date()))

    expect(result.dismissed).toBe(true)
    expect(result.reminderVisible).toBe(true)
  })

  test('makes a missing progress row ineligible', async () => {
    const result = await status('owner', false, false, null)

    expect(result.eligible).toBe(false)
    expect(result.reminderVisible).toBe(false)
  })

  test('keeps members and viewers ineligible', async () => {
    await expect(status('member', false, false)).resolves.toMatchObject({ eligible: false })
    await expect(status('viewer', false, false)).resolves.toMatchObject({ eligible: false })
  })

  test('dismisses an eligible owner and is idempotent', async () => {
    const progressRepository = repository()
    const command = { organizationId: 'org_1', role: 'owner' as const, userId: 'user_1' }

    await expect(dismissFinancialOnboarding(command, progressRepository)).resolves.toEqual({
      ok: true,
      value: undefined,
    })
    await expect(dismissFinancialOnboarding(command, progressRepository)).resolves.toEqual({
      ok: true,
      value: undefined,
    })
    expect(progressRepository.dismissed).toBe(2)
  })

  test('rejects dismissal for a non-owner or ineligible owner', async () => {
    const progressRepository = repository(null)

    await expect(
      dismissFinancialOnboarding(
        { organizationId: 'org_1', role: 'member', userId: 'user_1' },
        progressRepository,
      ),
    ).resolves.toMatchObject({ ok: false, error: { code: 'insufficient_role' } })
    await expect(
      dismissFinancialOnboarding(
        { organizationId: 'org_1', role: 'owner', userId: 'user_1' },
        progressRepository,
      ),
    ).resolves.toMatchObject({ ok: false, error: { code: 'ineligible' } })
  })
})

describe('startFinancialOnboarding', () => {
  test('creates the progress row a failed creation hook never wrote', async () => {
    const store = repository(null)

    const result = await startFinancialOnboarding(
      { organizationId: 'org_1', role: 'owner', userId: 'user_1' },
      store,
    )

    expect(result.ok).toBe(true)
    expect(store.ensured).toBe(1)
    expect(await store.findByUser('org_1', 'user_1')).toMatchObject({ dismissedAt: null })
  })

  test('does not require the row it exists to repair', async () => {
    // The status use case reads eligibility from the row; this one cannot, or
    // a workspace whose hook failed would be permanently ineligible.
    const store = repository(null)

    expect(
      (
        await startFinancialOnboarding(
          { organizationId: 'org_1', role: 'owner', userId: 'user_1' },
          store,
        )
      ).ok,
    ).toBe(true)
  })

  test('leaves an existing deferral alone', async () => {
    const dismissedAt = new Date('2026-09-20T00:00:00.000Z')
    const store = repository(progress(dismissedAt))

    await startFinancialOnboarding(
      { organizationId: 'org_1', role: 'owner', userId: 'user_1' },
      store,
    )

    expect((await store.findByUser('org_1', 'user_1'))?.dismissedAt).toBe(dismissedAt)
  })

  test('refuses a role that is not the workspace owner', async () => {
    const store = repository(null)

    const result = await startFinancialOnboarding(
      { organizationId: 'org_1', role: 'admin', userId: 'user_1' },
      store,
    )

    expect(result.ok).toBe(false)
    expect(result.ok ? null : result.error.code).toBe('insufficient_role')
    expect(store.ensured).toBe(0)
  })
})
