import { describe, expect, test } from 'bun:test'

import { generateEntityId } from '../../primitives'
import type { CardInvoice } from '../invoice'
import type { InvoiceRepository } from '../ports'
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
      { id: invoice.id, organizationId: ORGANIZATION_ID, role: 'owner' },
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
      { id: invoice.id, organizationId: ORGANIZATION_ID, role: 'owner' },
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
      { id: invoice.id, organizationId: ORGANIZATION_ID, role: 'owner' },
      invoices,
    )

    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error.code).toBe('invoice_already_paid')
  })

  test('rejects a viewer before ever reading the invoice', async () => {
    const invoice = buildInvoice()
    const invoices = createFakeInvoiceRepository([invoice])

    const result = await closeInvoice(
      { id: invoice.id, organizationId: ORGANIZATION_ID, role: 'viewer' },
      invoices,
    )

    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error.code).toBe('insufficient_role')
  })

  test('a version changed by a concurrent close between the read and the write is a conflict', async () => {
    const invoice = buildInvoice()
    const base = createFakeInvoiceRepository([invoice])
    // The version this use case writes with always comes from its own read
    // (Fase 04 § Riscos), so the only way to prove `version_conflict` is a
    // repository that loses the race underneath it, not a stale caller input.
    const racingRepository: InvoiceRepository = {
      ...base,
      close: async () => 'version_conflict',
    }

    const result = await closeInvoice(
      { id: invoice.id, organizationId: ORGANIZATION_ID, role: 'owner' },
      racingRepository,
    )

    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error.code).toBe('version_conflict')
  })

  test('rejects an unknown invoice', async () => {
    const invoices = createFakeInvoiceRepository()

    const result = await closeInvoice(
      { id: generateEntityId(), organizationId: ORGANIZATION_ID, role: 'owner' },
      invoices,
    )

    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error.code).toBe('invoice_not_found')
  })
})
