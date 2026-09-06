import { describe, expect, test } from 'bun:test'

import { generateEntityId } from '../../primitives'
import { DEFAULT_WORKSPACE_CURRENCY } from '../account'
import { type CreateAccountCommand, createAccount } from './create-account'
import { createFakeAccountRepository } from './fake-account-repository'

const baseCommand: CreateAccountCommand = {
  color: null,
  currency: DEFAULT_WORKSPACE_CURRENCY,
  icon: null,
  institution: null,
  kind: 'checking',
  name: 'Main checking',
  openingBalanceDate: null,
  openingBalanceMinor: 0,
  organizationId: 'org_a',
  role: 'owner',
  userId: generateEntityId(),
}

describe('createAccount', () => {
  test('creates the account without an opening entry when the balance is zero', async () => {
    const repository = createFakeAccountRepository()

    const result = await createAccount(baseCommand, repository)

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.value.name).toBe('Main checking')
    expect(result.value.version).toBe(1)
    expect(repository.entriesByAccount.has(result.value.id)).toBe(false)
  })

  test('turns a non-zero opening balance into one dated entry, not a column', async () => {
    const repository = createFakeAccountRepository()

    const result = await createAccount(
      { ...baseCommand, openingBalanceDate: '2026-01-15', openingBalanceMinor: 10_000 },
      repository,
    )

    expect(result.ok).toBe(true)
    if (!result.ok) return
    const entries = repository.entriesByAccount.get(result.value.id)
    expect(entries).toEqual([
      { amountMinor: 10_000, id: expect.any(String), occurredOn: '2026-01-15' },
    ])
  })

  test('rejects a name already used in the same workspace, compared without case or spacing', async () => {
    const repository = createFakeAccountRepository()
    await createAccount(baseCommand, repository)

    const result = await createAccount({ ...baseCommand, name: '  MAIN CHECKING  ' }, repository)

    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error.code).toBe('account_name_taken')
  })

  test('the same name is available again in a different workspace', async () => {
    const repository = createFakeAccountRepository()
    await createAccount(baseCommand, repository)

    const result = await createAccount({ ...baseCommand, organizationId: 'org_b' }, repository)

    expect(result.ok).toBe(true)
  })
})
