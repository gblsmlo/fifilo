import { describe, expect, test } from 'bun:test'

import { generateEntityId } from '../../primitives'
import type { CardInvoice } from '../invoice'
import { closeInvoice } from './close-invoice'
import { createFakeInvoiceRepository } from './fake-invoice-repository'

const ORGANIZATION_ID = 'org_1'

const buildInvoice = (overrides: Partial<CardInvoice> = {}): CardInvoice => ({
  accountId: generateEntityId(),
  closedAt: null,
  dueOn: '2026-06-20',
  id: generateEntityId(),
  organizationId: ORGANIZATION_ID,
  paidAt: null,
  periodEnd: '2026-06-10',
  periodStart: '2026-05-11',
  status: 'open',
  totalMinor: 0,
  version: 1,
  ...overrides,
})

describe('closeInvoice', () => {
  test('closes an open invoice and freezes the summed total', async () => {
    const invoice = buildInvoice()
    const invoices = createFakeInvoiceRepository([invoice])

    const result = await closeInvoice(
      { expectedVersion: 1, id: invoice.id, organizationId: ORGANIZATION_ID },
      invoices,
    )

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.value.status).toBe('closed')
    expect(result.value.closedAt).not.toBeNull()
  })

  test('closing an already-closed invoice is a no-op, not a conflict (idempotent)', async () => {
    const invoice = buildInvoice({ closedAt: new Date(), status: 'closed', totalMinor: 5_000 })
    const invoices = createFakeInvoiceRepository([invoice])

    const result = await closeInvoice(
      { expectedVersion: invoice.version, id: invoice.id, organizationId: ORGANIZATION_ID },
      invoices,
    )

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.value.totalMinor).toBe(5_000)
  })

  test('rejects closing a paid invoice', async () => {
    const invoice = buildInvoice({ paidAt: new Date(), status: 'paid' })
    const invoices = createFakeInvoiceRepository([invoice])

    const result = await closeInvoice(
      { expectedVersion: invoice.version, id: invoice.id, organizationId: ORGANIZATION_ID },
      invoices,
    )

    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error.code).toBe('invoice_already_paid')
  })

  test('rejects a stale version when closing an open invoice', async () => {
    const invoice = buildInvoice()
    const invoices = createFakeInvoiceRepository([invoice])

    const result = await closeInvoice(
      { expectedVersion: invoice.version + 1, id: invoice.id, organizationId: ORGANIZATION_ID },
      invoices,
    )

    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error.code).toBe('version_conflict')
  })

  test('rejects an unknown invoice', async () => {
    const invoices = createFakeInvoiceRepository()

    const result = await closeInvoice(
      { expectedVersion: 1, id: generateEntityId(), organizationId: ORGANIZATION_ID },
      invoices,
    )

    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error.code).toBe('invoice_not_found')
  })
})
