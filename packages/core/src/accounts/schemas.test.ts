import { describe, expect, test } from 'bun:test'

import {
  createAccountRequestSchema,
  listAccountsQuerySchema,
  openingBalanceHasDate,
} from './schemas'

describe('listAccountsQuerySchema', () => {
  test('parses the query string "false" as false', () => {
    // `Boolean('false')` is `true`: a query value is always a string, and the
    // literal text is what must decide, not JavaScript's truthiness coercion.
    expect(listAccountsQuerySchema.parse({ includeArchived: 'false' })).toEqual({
      includeArchived: false,
    })
  })

  test('parses the query string "true" as true', () => {
    expect(listAccountsQuerySchema.parse({ includeArchived: 'true' })).toEqual({
      includeArchived: true,
    })
  })

  test('defaults to false when omitted', () => {
    expect(listAccountsQuerySchema.parse({})).toEqual({ includeArchived: false })
  })
})

describe('openingBalanceHasDate', () => {
  test('accepts an account with no opening balance at all', () => {
    expect(openingBalanceHasDate({})).toBe(true)
  })

  test('accepts a zero opening balance without a date, since it seeds no entry', () => {
    expect(openingBalanceHasDate({ openingBalanceMinor: 0 })).toBe(true)
  })

  test('rejects an opening balance without the civil date it happened on', () => {
    expect(openingBalanceHasDate({ openingBalanceMinor: 428_000 })).toBe(false)
  })

  test('accepts an opening balance carrying its date', () => {
    expect(
      openingBalanceHasDate({ openingBalanceDate: '2026-09-21', openingBalanceMinor: 428_000 }),
    ).toBe(true)
  })

  test('the contract schema reports the failure on the date field', () => {
    const result = createAccountRequestSchema.safeParse({
      kind: 'checking',
      name: 'Conta corrente',
      openingBalanceMinor: 428_000,
    })

    expect(result.success).toBe(false)
    expect(result.error?.issues[0]?.path).toEqual(['openingBalanceDate'])
  })
})
