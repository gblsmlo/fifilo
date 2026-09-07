import { describe, expect, test } from 'bun:test'

import { MONEY_AMOUNT_MINOR_MAX, generateEntityId } from '../../primitives'
import type { Account } from '../account'
import { DEFAULT_WORKSPACE_CURRENCY } from '../account'
import { createFakeAccountRepository, createFakeEntryReader } from './fake-account-repository'
import { getBalances } from './get-balances'

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

describe('getBalances', () => {
  test('reports a per-account balance and the consolidated sum', async () => {
    const checking = seedAccount({ name: 'Checking' })
    const savings = seedAccount({ name: 'Savings' })
    const repository = createFakeAccountRepository([checking, savings])
    const entries = createFakeEntryReader({
      org_a: { [checking.id]: 10_000, [savings.id]: 5_000 },
    })

    const result = await getBalances(
      {
        asOf: '2026-01-31',
        organizationId: 'org_a',
        workspaceCurrency: DEFAULT_WORKSPACE_CURRENCY,
      },
      repository,
      entries,
    )

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.value.accounts).toEqual(
      expect.arrayContaining([
        {
          accountId: checking.id,
          balance: { amountMinor: 10_000, currency: DEFAULT_WORKSPACE_CURRENCY },
        },
        {
          accountId: savings.id,
          balance: { amountMinor: 5_000, currency: DEFAULT_WORKSPACE_CURRENCY },
        },
      ]),
    )
    expect(result.value.consolidated).toEqual({
      amountMinor: 15_000,
      currency: DEFAULT_WORKSPACE_CURRENCY,
    })
  })

  test('an account with no entries yet has a zero balance, not a missing one', async () => {
    const account = seedAccount()
    const repository = createFakeAccountRepository([account])
    const entries = createFakeEntryReader({})

    const result = await getBalances(
      {
        asOf: '2026-01-31',
        organizationId: 'org_a',
        workspaceCurrency: DEFAULT_WORKSPACE_CURRENCY,
      },
      repository,
      entries,
    )

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.value.accounts).toEqual([
      { accountId: account.id, balance: { amountMinor: 0, currency: DEFAULT_WORKSPACE_CURRENCY } },
    ])
    expect(result.value.consolidated).toEqual({
      amountMinor: 0,
      currency: DEFAULT_WORKSPACE_CURRENCY,
    })
  })

  test('a workspace with no accounts yet reports zero, not an error', async () => {
    const repository = createFakeAccountRepository([])
    const entries = createFakeEntryReader({})

    const result = await getBalances(
      {
        asOf: '2026-01-31',
        organizationId: 'org_a',
        workspaceCurrency: DEFAULT_WORKSPACE_CURRENCY,
      },
      repository,
      entries,
    )

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.value.accounts).toEqual([])
    expect(result.value.consolidated).toEqual({
      amountMinor: 0,
      currency: DEFAULT_WORKSPACE_CURRENCY,
    })
  })

  test('a balance beyond the safe range is a validation failure, not a wrong number', async () => {
    const account = seedAccount()
    const repository = createFakeAccountRepository([account])
    const entries = createFakeEntryReader({
      org_a: { [account.id]: MONEY_AMOUNT_MINOR_MAX + 1 },
    })

    const result = await getBalances(
      {
        asOf: '2026-01-31',
        organizationId: 'org_a',
        workspaceCurrency: DEFAULT_WORKSPACE_CURRENCY,
      },
      repository,
      entries,
    )

    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error.code).toBe('balance_out_of_range')
  })
})
