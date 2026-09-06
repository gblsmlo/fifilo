import { describe, expect, test } from 'bun:test'

import { listAccountsQuerySchema } from './schemas'

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
