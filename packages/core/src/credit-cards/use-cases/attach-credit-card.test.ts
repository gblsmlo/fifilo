import { describe, expect, test } from 'bun:test'

import { generateEntityId } from '../../primitives'
import { attachCreditCard } from './attach-credit-card'
import {
  createFakeCardAccountLookup,
  createFakeCreditCardRepository,
} from './fake-credit-card-repository'

const ORGANIZATION_ID = 'org_1'

describe('attachCreditCard', () => {
  test('attaches details to an active credit card account', async () => {
    const accountId = generateEntityId()
    const accounts = createFakeCardAccountLookup([
      { archivedAt: null, currency: 'BRL', id: accountId, kind: 'credit_card' },
    ])
    const repository = createFakeCreditCardRepository()

    const result = await attachCreditCard(
      {
        accountId,
        closingDay: 10,
        dueDay: 20,
        limitMinor: 500_000,
        organizationId: ORGANIZATION_ID,
        role: 'owner',
      },
      repository,
      accounts,
    )

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.value.limitMinor).toBe(500_000)
  })

  test('rejects an account that is not a credit card', async () => {
    const accountId = generateEntityId()
    const accounts = createFakeCardAccountLookup([
      { archivedAt: null, currency: 'BRL', id: accountId, kind: 'checking' },
    ])
    const repository = createFakeCreditCardRepository()

    const result = await attachCreditCard(
      {
        accountId,
        closingDay: 10,
        dueDay: 20,
        limitMinor: 500_000,
        organizationId: ORGANIZATION_ID,
        role: 'owner',
      },
      repository,
      accounts,
    )

    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error.code).toBe('account_not_credit_card')
  })

  test('rejects an archived account', async () => {
    const accountId = generateEntityId()
    const accounts = createFakeCardAccountLookup([
      { archivedAt: new Date(), currency: 'BRL', id: accountId, kind: 'credit_card' },
    ])
    const repository = createFakeCreditCardRepository()

    const result = await attachCreditCard(
      {
        accountId,
        closingDay: 10,
        dueDay: 20,
        limitMinor: 500_000,
        organizationId: ORGANIZATION_ID,
        role: 'owner',
      },
      repository,
      accounts,
    )

    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error.code).toBe('account_archived')
  })

  test('rejects a second attachment to the same account', async () => {
    const accountId = generateEntityId()
    const accounts = createFakeCardAccountLookup([
      { archivedAt: null, currency: 'BRL', id: accountId, kind: 'credit_card' },
    ])
    const repository = createFakeCreditCardRepository()
    const command = {
      accountId,
      closingDay: 10,
      dueDay: 20,
      limitMinor: 500_000,
      organizationId: ORGANIZATION_ID,
      role: 'owner' as const,
    }

    await attachCreditCard(command, repository, accounts)
    const second = await attachCreditCard(command, repository, accounts)

    expect(second.ok).toBe(false)
    if (!second.ok) expect(second.error.code).toBe('credit_card_already_attached')
  })

  test('rejects an unknown account', async () => {
    const repository = createFakeCreditCardRepository()
    const accounts = createFakeCardAccountLookup([])

    const result = await attachCreditCard(
      {
        accountId: generateEntityId(),
        closingDay: 10,
        dueDay: 20,
        limitMinor: 500_000,
        organizationId: ORGANIZATION_ID,
        role: 'owner',
      },
      repository,
      accounts,
    )

    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error.code).toBe('account_not_found')
  })
})
