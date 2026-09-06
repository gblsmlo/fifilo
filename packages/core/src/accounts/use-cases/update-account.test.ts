import { describe, expect, test } from 'bun:test'

import { generateEntityId } from '../../primitives'
import type { Account } from '../account'
import { DEFAULT_WORKSPACE_CURRENCY } from '../account'
import { createFakeAccountRepository } from './fake-account-repository'
import { updateAccount } from './update-account'

const seedAccount = (overrides: Partial<Account> = {}): Account => ({
  archivedAt: null,
  color: null,
  createdAt: new Date('2026-01-01'),
  createdBy: generateEntityId(),
  currency: DEFAULT_WORKSPACE_CURRENCY,
  icon: null,
  id: generateEntityId(),
  institution: null,
  kind: 'checking',
  name: 'Main checking',
  organizationId: 'org_a',
  updatedAt: new Date('2026-01-01'),
  version: 1,
  ...overrides,
})

describe('updateAccount', () => {
  test('applies the patch and bumps the version', async () => {
    const account = seedAccount()
    const repository = createFakeAccountRepository([account])

    const result = await updateAccount(
      {
        expectedVersion: 1,
        id: account.id,
        organizationId: 'org_a',
        patch: { institution: 'Bank A' },
        role: 'owner',
      },
      repository,
    )

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.value.institution).toBe('Bank A')
    expect(result.value.version).toBe(2)
  })

  test('a stale version is a conflict, not a silent overwrite', async () => {
    const account = seedAccount({ version: 3 })
    const repository = createFakeAccountRepository([account])

    const result = await updateAccount(
      {
        expectedVersion: 1,
        id: account.id,
        organizationId: 'org_a',
        patch: { institution: 'Bank A' },
        role: 'owner',
      },
      repository,
    )

    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error.code).toBe('version_conflict')
  })

  test('an account from another organization is not found, not edited', async () => {
    const account = seedAccount()
    const repository = createFakeAccountRepository([account])

    const result = await updateAccount(
      {
        expectedVersion: 1,
        id: account.id,
        organizationId: 'org_b',
        patch: { institution: 'Bank A' },
        role: 'owner',
      },
      repository,
    )

    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error.code).toBe('account_not_found')
  })

  test('renaming to a name already used by another account is a conflict', async () => {
    const savings = seedAccount({ id: generateEntityId(), name: 'Savings' })
    const checking = seedAccount({ id: generateEntityId(), name: 'Checking' })
    const repository = createFakeAccountRepository([savings, checking])

    const result = await updateAccount(
      {
        expectedVersion: 1,
        id: checking.id,
        organizationId: 'org_a',
        patch: { name: 'savings' },
        role: 'owner',
      },
      repository,
    )

    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error.code).toBe('account_name_taken')
  })

  test('keeping an account`s own name is not a conflict with itself', async () => {
    const account = seedAccount({ name: 'Checking' })
    const repository = createFakeAccountRepository([account])

    const result = await updateAccount(
      {
        expectedVersion: 1,
        id: account.id,
        organizationId: 'org_a',
        patch: { name: 'Checking', institution: 'Bank A' },
        role: 'owner',
      },
      repository,
    )

    expect(result.ok).toBe(true)
  })
})
