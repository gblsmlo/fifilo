import { describe, expect, test } from 'bun:test'

import { generateEntityId } from '../../primitives'
import type { CardInvoice } from '../invoice'
import { createFakeCreditCardRepository } from './fake-credit-card-repository'
import { createFakeInvoiceRepository } from './fake-invoice-repository'
import { getAvailableLimit } from './get-available-limit'

const ORGANIZATION_ID = 'org_1'

describe('getAvailableLimit', () => {
  test('subtracts unpaid closed invoices from the limit when the open invoice is empty', async () => {
    const accountId = generateEntityId()
    const cards = createFakeCreditCardRepository()
    await cards.create({
      accountId,
      closingDay: 10,
      createdAt: new Date(),
      dueDay: 20,
      limitMinor: 100_000,
      organizationId: ORGANIZATION_ID,
    })
    const closedInvoice: CardInvoice = {
      accountId,
      closedAt: new Date(),
      dueOn: '2026-06-20',
      id: generateEntityId(),
      organizationId: ORGANIZATION_ID,
      paidAt: null,
      periodEnd: '2026-06-10',
      periodStart: '2026-05-11',
      status: 'closed',
      totalMinor: 30_000,
      version: 2,
    }
    const invoices = createFakeInvoiceRepository([closedInvoice])

    const result = await getAvailableLimit(
      { accountId, currency: 'BRL', organizationId: ORGANIZATION_ID },
      cards,
      invoices,
    )

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.value.amountMinor).toBe(70_000)
  })

  test('rejects a query for an account with no credit card details', async () => {
    const result = await getAvailableLimit(
      { accountId: generateEntityId(), currency: 'BRL', organizationId: ORGANIZATION_ID },
      createFakeCreditCardRepository(),
      createFakeInvoiceRepository(),
    )

    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error.code).toBe('credit_card_not_configured')
  })
})
