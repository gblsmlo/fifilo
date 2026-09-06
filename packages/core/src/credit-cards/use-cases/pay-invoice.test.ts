import { describe, expect, test } from 'bun:test'

import { generateEntityId } from '../../primitives'
import {
  createFakeAccountLookup,
  createFakeTransactionRepository,
} from '../../transactions/use-cases/fake-transaction-repository'
import type { CardInvoice } from '../invoice'
import { createFakeCardAccountLookup } from './fake-credit-card-repository'
import { createFakeInvoiceRepository } from './fake-invoice-repository'
import { payInvoice } from './pay-invoice'

const ORGANIZATION_ID = 'org_1'

describe('payInvoice', () => {
  test('pays a closed invoice in full as a transfer from the source account to the card', async () => {
    const cardAccountId = generateEntityId()
    const checkingId = generateEntityId()
    const invoice: CardInvoice = {
      accountId: cardAccountId,
      closedAt: new Date(),
      dueOn: '2026-06-20',
      id: generateEntityId(),
      organizationId: ORGANIZATION_ID,
      paidAt: null,
      periodEnd: '2026-06-10',
      periodStart: '2026-05-11',
      status: 'closed',
      totalMinor: 12_000,
      version: 2,
    }
    const invoices = createFakeInvoiceRepository([invoice])
    const cardAccounts = createFakeCardAccountLookup([
      { archivedAt: null, currency: 'BRL', id: cardAccountId, kind: 'credit_card' },
    ])
    const accounts = createFakeAccountLookup([
      { archivedAt: null, currency: 'BRL', id: checkingId },
      { archivedAt: null, currency: 'BRL', id: cardAccountId },
    ])
    const transactions = createFakeTransactionRepository()

    const result = await payInvoice(
      {
        fromAccountId: checkingId,
        id: invoice.id,
        organizationId: ORGANIZATION_ID,
        today: '2026-06-15',
        userId: generateEntityId(),
      },
      invoices,
      cardAccounts,
      accounts,
      transactions,
    )

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.value.invoice.status).toBe('paid')

    const legs = transactions.legsByTransactionId.get(result.value.transactionId) ?? []
    expect(legs).toEqual([
      { accountId: checkingId, amountMinor: -12_000, currency: 'BRL', id: expect.any(String) },
      { accountId: cardAccountId, amountMinor: 12_000, currency: 'BRL', id: expect.any(String) },
    ])
  })

  test('rejects paying the same invoice twice - the second call finds it already paid', async () => {
    const cardAccountId = generateEntityId()
    const checkingId = generateEntityId()
    const invoice: CardInvoice = {
      accountId: cardAccountId,
      closedAt: new Date(),
      dueOn: '2026-06-20',
      id: generateEntityId(),
      organizationId: ORGANIZATION_ID,
      paidAt: null,
      periodEnd: '2026-06-10',
      periodStart: '2026-05-11',
      status: 'closed',
      totalMinor: 12_000,
      version: 2,
    }
    const invoices = createFakeInvoiceRepository([invoice])
    const cardAccounts = createFakeCardAccountLookup([
      { archivedAt: null, currency: 'BRL', id: cardAccountId, kind: 'credit_card' },
    ])
    const accounts = createFakeAccountLookup([
      { archivedAt: null, currency: 'BRL', id: checkingId },
      { archivedAt: null, currency: 'BRL', id: cardAccountId },
    ])
    const transactions = createFakeTransactionRepository()
    const command = {
      fromAccountId: checkingId,
      id: invoice.id,
      organizationId: ORGANIZATION_ID,
      today: '2026-06-15',
      userId: generateEntityId(),
    }

    const first = await payInvoice(command, invoices, cardAccounts, accounts, transactions)
    expect(first.ok).toBe(true)

    const second = await payInvoice(command, invoices, cardAccounts, accounts, transactions)
    expect(second.ok).toBe(false)
    if (!second.ok) expect(second.error.code).toBe('invoice_already_paid')

    // Exactly one transfer was ever written - the guard, not a lucky race.
    expect(transactions.legsByTransactionId.size).toBe(1)
  })

  test('rejects paying an invoice that has not been closed yet', async () => {
    const cardAccountId = generateEntityId()
    const checkingId = generateEntityId()
    const invoice: CardInvoice = {
      accountId: cardAccountId,
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
    const invoices = createFakeInvoiceRepository([invoice])
    const cardAccounts = createFakeCardAccountLookup([
      { archivedAt: null, currency: 'BRL', id: cardAccountId, kind: 'credit_card' },
    ])
    const accounts = createFakeAccountLookup([
      { archivedAt: null, currency: 'BRL', id: checkingId },
    ])
    const transactions = createFakeTransactionRepository()

    const result = await payInvoice(
      {
        fromAccountId: checkingId,
        id: invoice.id,
        organizationId: ORGANIZATION_ID,
        today: '2026-06-15',
        userId: generateEntityId(),
      },
      invoices,
      cardAccounts,
      accounts,
      transactions,
    )

    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error.code).toBe('invoice_not_closed')
  })
})
