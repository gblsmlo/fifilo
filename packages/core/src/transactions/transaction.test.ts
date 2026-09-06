import { describe, expect, test } from 'bun:test'

import { generateEntityId } from '../primitives'
import { deriveLegs } from './transaction'

/**
 * Fase 02's own closing criterion: the leg-sum invariant proved for the
 * three kinds (income +value, expense -value, transfer sums to zero).
 */
describe('deriveLegs', () => {
  test('income is one positive leg', () => {
    const accountId = generateEntityId()
    const legs = deriveLegs({ accountId, amountMinor: 5_000, kind: 'income' })

    expect(legs).toEqual([{ accountId, amountMinor: 5_000 }])
  })

  test('expense is one negative leg', () => {
    const accountId = generateEntityId()
    const legs = deriveLegs({ accountId, amountMinor: 5_000, kind: 'expense' })

    expect(legs).toEqual([{ accountId, amountMinor: -5_000 }])
  })

  test('transfer is two opposite legs summing to zero', () => {
    const fromAccountId = generateEntityId()
    const toAccountId = generateEntityId()
    const legs = deriveLegs({ amountMinor: 5_000, fromAccountId, kind: 'transfer', toAccountId })

    expect(legs).toEqual([
      { accountId: fromAccountId, amountMinor: -5_000 },
      { accountId: toAccountId, amountMinor: 5_000 },
    ])
    expect(legs.reduce((sum, leg) => sum + leg.amountMinor, 0)).toBe(0)
  })
})
