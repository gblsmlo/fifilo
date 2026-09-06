import { describe, expect, test } from 'bun:test'

import { generateEntityId } from '../../primitives'
import type { Account } from '../account'
import { DEFAULT_WORKSPACE_CURRENCY } from '../account'
import { archiveAccount } from './archive-account'
import { createFakeAccountRepository } from './fake-account-repository'

const seedAccount = (overrides: Partial<Account> = {}): Account => ({
  archivedAt: null,
  color: null,
  createdAt: new Date('2026-01-01'),
  createdBy: generateEntityId(),
  currency: DEFAULT_WORKSPACE_CURRENCY,
  icon: null,
  id: generateEntityId(),
  institution: null,
  kind: 'wallet',
  name: 'Wallet',
  organizationId: 'org_a',
  updatedAt: new Date('2026-01-01'),
  version: 1,
  ...overrides,
})

describe('archiveAccount', () => {
  test('archives the account, keeping its history', async () => {
    const account = seedAccount()
    const repository = createFakeAccountRepository([account])

    const result = await archiveAccount({ id: account.id, organizationId: 'org_a' }, repository)

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.value.archivedAt).not.toBeNull()

    const stillListed = await repository.list('org_a', { includeArchived: true })
    expect(stillListed).toHaveLength(1)
  })

  test('archiving the only active account is allowed - the domain does not block it', async () => {
    const account = seedAccount()
    const repository = createFakeAccountRepository([account])

    const result = await archiveAccount({ id: account.id, organizationId: 'org_a' }, repository)

    expect(result.ok).toBe(true)

    const activeOnly = await repository.list('org_a', { includeArchived: false })
    expect(activeOnly).toHaveLength(0)
  })

  test('an account from another organization is not found', async () => {
    const account = seedAccount()
    const repository = createFakeAccountRepository([account])

    const result = await archiveAccount({ id: account.id, organizationId: 'org_b' }, repository)

    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error.code).toBe('account_not_found')
  })
})
