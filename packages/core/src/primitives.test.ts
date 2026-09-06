import { describe, expect, test } from 'bun:test'

import {
  MONEY_AMOUNT_MINOR_MAX,
  add,
  allocate,
  compare,
  currencyExponent,
  money,
  negate,
  subtract,
} from './primitives'

describe('money', () => {
  test('accepts an integer amount within the safe range', () => {
    expect(money(1000, 'BRL')).toEqual({ ok: true, value: { amountMinor: 1000, currency: 'BRL' } })
  })

  test('rejects an amount beyond the safe-integer ceiling', () => {
    const result = money(MONEY_AMOUNT_MINOR_MAX + 1, 'BRL')
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error.code).toBe('amount_out_of_range')
  })

  test('accepts the ceiling itself', () => {
    expect(money(MONEY_AMOUNT_MINOR_MAX, 'BRL').ok).toBe(true)
  })

  test('rejects a non-integer amount', () => {
    expect(money(10.5, 'BRL').ok).toBe(false)
  })

  test('reads the minor-unit exponent from the currency table, never assuming 2', () => {
    expect(currencyExponent('BRL')).toBe(2)
    expect(currencyExponent('JPY')).toBe(0)
    expect(currencyExponent('BHD')).toBe(3)
  })
})

describe('add / subtract / negate / compare', () => {
  const ten = { amountMinor: 1000, currency: 'BRL' } as const
  const three = { amountMinor: 300, currency: 'BRL' } as const
  const usd = { amountMinor: 300, currency: 'USD' } as const

  test('adds two amounts of the same currency', () => {
    expect(add(ten, three)).toEqual({ ok: true, value: { amountMinor: 1300, currency: 'BRL' } })
  })

  test('subtracts two amounts of the same currency', () => {
    expect(subtract(ten, three)).toEqual({ ok: true, value: { amountMinor: 700, currency: 'BRL' } })
  })

  test('refuses to combine different currencies instead of converting', () => {
    const result = add(ten, usd)
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error.code).toBe('currency_mismatch')
  })

  test('negate flips the sign and keeps the currency', () => {
    expect(negate(ten)).toEqual({ amountMinor: -1000, currency: 'BRL' })
  })

  test('compare orders same-currency amounts and reports ties', () => {
    expect(compare(three, ten)).toEqual({ ok: true, value: -1 })
    expect(compare(ten, three)).toEqual({ ok: true, value: 1 })
    expect(compare(ten, ten)).toEqual({ ok: true, value: 0 })
  })
})

describe('allocate', () => {
  test('splits the remainder one minor unit at a time so shares sum back to the total', () => {
    const total = { amountMinor: 100, currency: 'BRL' } as const
    const result = allocate(total, 3)
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.value.map((share) => share.amountMinor)).toEqual([34, 33, 33])
    expect(result.value.reduce((sum, share) => sum + share.amountMinor, 0)).toBe(100)
  })

  test('keeps the sign on every share of a negative amount', () => {
    const total = { amountMinor: -100, currency: 'BRL' } as const
    const result = allocate(total, 3)
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.value.map((share) => share.amountMinor)).toEqual([-34, -33, -33])
  })

  test('rejects a non-positive number of parts', () => {
    const total = { amountMinor: 100, currency: 'BRL' } as const
    expect(allocate(total, 0).ok).toBe(false)
    expect(allocate(total, -1).ok).toBe(false)
  })
})
