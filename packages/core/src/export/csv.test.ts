import { describe, expect, test } from 'bun:test'
import { generateEntityId } from '../primitives'
import { toCsv } from './csv'
import type { ExportRow } from './ports'

const row = (overrides: Partial<ExportRow> = {}): ExportRow => ({
  accountName: 'Conta corrente',
  amountMinor: 10_000,
  categoryName: 'Mercado',
  currency: 'BRL',
  description: 'Compra do mês',
  invoiceId: null,
  kind: 'expense',
  occurredOn: '2026-01-10',
  transactionId: generateEntityId(),
  ...overrides,
})

describe('toCsv', () => {
  test('writes the header row and one line per entry', () => {
    const csv = toCsv([row()])
    const lines = csv.split('\r\n')

    expect(lines[0]).toBe(
      'occurredOn,kind,description,categoryName,accountName,amountMinor,currency,invoiceId,transactionId',
    )
    expect(lines[1]).toContain(
      '2026-01-10,expense,Compra do mês,Mercado,Conta corrente,10000,BRL,,',
    )
  })

  test('a null category or invoice becomes an empty cell, not the string "null"', () => {
    const csv = toCsv([row({ categoryName: null, invoiceId: null })])
    expect(csv).not.toContain('null')
  })

  test('quotes a description containing a comma or a newline, doubling any embedded quote', () => {
    const csv = toCsv([row({ description: 'Almoço, café "expresso"\ne água' })])
    expect(csv).toContain('"Almoço, café ""expresso""\ne água"')
  })

  test('guards a formula-looking description with a leading apostrophe', () => {
    const csv = toCsv([row({ description: '=cmd|/C calc' })])
    expect(csv).toContain(",'=cmd|/C calc,")
  })

  test('an empty row set still writes just the header', () => {
    expect(toCsv([])).toBe(
      'occurredOn,kind,description,categoryName,accountName,amountMinor,currency,invoiceId,transactionId\r\n',
    )
  })
})
