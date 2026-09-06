import { describe, expect, test } from 'bun:test'
import { generateEntityId } from '../../primitives'
import type { CardInvoice } from '../invoice'
import { createFakeInvoiceRepository } from './fake-invoice-repository'
import { resolveInvoiceForOccurrence } from './resolve-invoice-for-occurrence'

const ORGANIZATION_ID = 'org_1'
const ACCOUNT_ID = generateEntityId()

describe('resolveInvoiceForOccurrence', () => {
  test('creates the open invoice for a fresh cycle when none exists yet', async () => {
    const invoices = createFakeInvoiceRepository()

    const resolved = await resolveInvoiceForOccurrence(
      {
        accountId: ACCOUNT_ID,
        closingDay: 10,
        dueDay: 20,
        occurredOn: '2026-06-05',
        organizationId: ORGANIZATION_ID,
        today: '2026-06-05',
      },
      invoices,
    )

    expect(resolved.retroactive).toBe(false)
    expect(resolved.invoice.periodStart).toBe('2026-05-11')
    expect(resolved.invoice.periodEnd).toBe('2026-06-10')
    expect(resolved.invoice.status).toBe('open')
  })

  test('reuses the same open invoice for a second entry in the same cycle', async () => {
    const invoices = createFakeInvoiceRepository()
    const command = {
      accountId: ACCOUNT_ID,
      closingDay: 10,
      dueDay: 20,
      occurredOn: '2026-06-05',
      organizationId: ORGANIZATION_ID,
      today: '2026-06-05',
    }

    const first = await resolveInvoiceForOccurrence(command, invoices)
    const second = await resolveInvoiceForOccurrence(
      { ...command, occurredOn: '2026-06-08' },
      invoices,
    )

    expect(second.invoice.id).toBe(first.invoice.id)
  })

  test('a retroactive entry whose natural invoice already closed lands on the current open one instead', async () => {
    const closedInvoice: CardInvoice = {
      accountId: ACCOUNT_ID,
      closedAt: new Date(),
      dueOn: '2026-05-20',
      id: generateEntityId(),
      organizationId: ORGANIZATION_ID,
      paidAt: null,
      periodEnd: '2026-05-10',
      periodStart: '2026-04-11',
      status: 'closed',
      totalMinor: 5000,
      version: 2,
    }
    const openInvoice: CardInvoice = {
      accountId: ACCOUNT_ID,
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
    }
    const invoices = createFakeInvoiceRepository([closedInvoice, openInvoice])

    const resolved = await resolveInvoiceForOccurrence(
      {
        accountId: ACCOUNT_ID,
        closingDay: 10,
        dueDay: 20,
        // Naturally belongs to the already-closed April 11 - May 10 cycle.
        occurredOn: '2026-04-20',
        organizationId: ORGANIZATION_ID,
        today: '2026-06-05',
      },
      invoices,
    )

    expect(resolved.retroactive).toBe(true)
    expect(resolved.invoice.id).toBe(openInvoice.id)
    expect(resolved.invoice.status).toBe('open')
  })

  test('never reopens the closed invoice itself even when it is the only one on file', async () => {
    const closedInvoice: CardInvoice = {
      accountId: ACCOUNT_ID,
      closedAt: new Date(),
      dueOn: '2026-05-20',
      id: generateEntityId(),
      organizationId: ORGANIZATION_ID,
      paidAt: null,
      periodEnd: '2026-05-10',
      periodStart: '2026-04-11',
      status: 'closed',
      totalMinor: 5000,
      version: 2,
    }
    const invoices = createFakeInvoiceRepository([closedInvoice])

    const resolved = await resolveInvoiceForOccurrence(
      {
        accountId: ACCOUNT_ID,
        closingDay: 10,
        dueDay: 20,
        occurredOn: '2026-04-20',
        organizationId: ORGANIZATION_ID,
        today: '2026-06-05',
      },
      invoices,
    )

    expect(resolved.invoice.id).not.toBe(closedInvoice.id)
    expect(resolved.invoice.status).toBe('open')
    expect(resolved.invoice.periodStart).toBe('2026-05-11')
  })
})
