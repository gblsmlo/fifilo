import { describe, expect, test } from 'bun:test'
import { generateEntityId } from '../../primitives'
import { exportTransactionsCsv } from './export-transactions'
import { createFakeExportReader } from './fake-export-reader'

const ORGANIZATION_ID = 'org_1'

describe('exportTransactionsCsv', () => {
  test('an owner receives the reader`s rows as CSV', async () => {
    const transactionId = generateEntityId()
    const reader = createFakeExportReader([
      {
        accountName: 'Conta corrente',
        amountMinor: 5_000,
        categoryName: 'Mercado',
        currency: 'BRL',
        description: 'Compra',
        invoiceId: null,
        kind: 'expense',
        occurredOn: '2026-01-10',
        transactionId,
      },
    ])

    const result = await exportTransactionsCsv(
      { from: '2026-01-01', organizationId: ORGANIZATION_ID, role: 'owner', to: '2026-01-31' },
      reader,
    )

    expect(result.ok).toBe(true)
    if (result.ok) expect(result.value).toContain('Compra')
  })

  test('an admin can export', async () => {
    const result = await exportTransactionsCsv(
      { from: '2026-01-01', organizationId: ORGANIZATION_ID, role: 'admin', to: '2026-01-31' },
      createFakeExportReader(),
    )

    expect(result.ok).toBe(true)
  })

  test.each(['member', 'viewer'] as const)('rejects %s before ever reading', async (role) => {
    let read = false
    const reader = createFakeExportReader()
    const spyingReader = {
      async transactionRows(organizationId: string, from: string, to: string) {
        read = true
        return reader.transactionRows(organizationId, from, to)
      },
    }

    const result = await exportTransactionsCsv(
      { from: '2026-01-01', organizationId: ORGANIZATION_ID, role, to: '2026-01-31' },
      spyingReader,
    )

    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error.code).toBe('insufficient_role')
    expect(read).toBe(false)
  })

  test('rejects an inverted range before ever reading', async () => {
    let read = false
    const spyingReader = {
      async transactionRows() {
        read = true
        return []
      },
    }

    const result = await exportTransactionsCsv(
      { from: '2026-02-01', organizationId: ORGANIZATION_ID, role: 'owner', to: '2026-01-01' },
      spyingReader,
    )

    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error.code).toBe('invalid_date_range')
    expect(read).toBe(false)
  })
})
