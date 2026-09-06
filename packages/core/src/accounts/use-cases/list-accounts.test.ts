import { describe, expect, test } from 'bun:test'

import { generateEntityId } from '../../primitives'
import type { Account } from '../account'
import { DEFAULT_WORKSPACE_CURRENCY } from '../account'
import { createFakeAccountRepository } from './fake-account-repository'
import { listAccounts } from './list-accounts'

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
  name: 'Account',
  organizationId: 'org_a',
  updatedAt: new Date('2026-01-01'),
  version: 1,
  ...overrides,
})

describe('listAccounts', () => {
  test('lists only active accounts by default', async () => {
    const active = seedAccount({ name: 'Active' })
    const archived = seedAccount({ archivedAt: new Date(), name: 'Archived' })
    const repository = createFakeAccountRepository([active, archived])

    const result = await listAccounts(
      { includeArchived: false, organizationId: 'org_a' },
      repository,
    )

    expect(result.map((account) => account.name)).toEqual(['Active'])
  })

  test('includes archived accounts when asked', async () => {
    const active = seedAccount({ name: 'Active' })
    const archived = seedAccount({ archivedAt: new Date(), name: 'Archived' })
    const repository = createFakeAccountRepository([active, archived])

    const result = await listAccounts(
      { includeArchived: true, organizationId: 'org_a' },
      repository,
    )

    expect(result.map((account) => account.name).sort()).toEqual(['Active', 'Archived'])
  })

  test('never returns another organization`s accounts', async () => {
    const mine = seedAccount({ name: 'Mine', organizationId: 'org_a' })
    const theirs = seedAccount({ name: 'Theirs', organizationId: 'org_b' })
    const repository = createFakeAccountRepository([mine, theirs])

    const result = await listAccounts(
      { includeArchived: true, organizationId: 'org_a' },
      repository,
    )

    expect(result.map((account) => account.name)).toEqual(['Mine'])
  })
})
