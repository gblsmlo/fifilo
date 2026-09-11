import { describe, expect, test } from 'bun:test'
import type { CardInvoice } from '../../credit-cards'
import { generateEntityId } from '../../primitives'
import { creditCardInvoiceTool } from './credit-card-invoice'
import { createFakeAssistantToolkit } from './fake-toolkit'
import type { ToolExecutionContext } from './types'

const ORGANIZATION_ID = 'org_1'
const ACCOUNT_ID = generateEntityId()

const context: ToolExecutionContext = {
  organizationId: ORGANIZATION_ID,
  role: 'viewer',
  today: '2026-09-15',
  userId: generateEntityId(),
}

const seedInvoice = (overrides: Partial<CardInvoice> = {}): CardInvoice => ({
  accountId: ACCOUNT_ID,
  closedAt: null,
  dueOn: '2026-09-10',
  id: generateEntityId(),
  organizationId: ORGANIZATION_ID,
  paidAt: null,
  periodEnd: '2026-08-31',
  periodStart: '2026-08-01',
  status: 'open',
  totalMinor: 45_000,
  version: 1,
  ...overrides,
})

describe('creditCardInvoiceTool', () => {
  test('resolves the most recent invoice when no id is given', async () => {
    const older = seedInvoice({ periodStart: '2026-07-01' })
    const newer = seedInvoice({ periodStart: '2026-08-01' })
    const toolkit = createFakeAssistantToolkit({ invoices: [older, newer] })

    const result = await creditCardInvoiceTool.execute({ accountId: ACCOUNT_ID }, context, toolkit)

    expect(result.ok).toBe(true)
    if (result.ok) expect(result.value.invoice.id).toBe(newer.id)
  })

  test('resolves a specific invoice by id when given', async () => {
    const first = seedInvoice({ periodStart: '2026-07-01' })
    const second = seedInvoice({ periodStart: '2026-08-01' })
    const toolkit = createFakeAssistantToolkit({ invoices: [first, second] })

    const result = await creditCardInvoiceTool.execute(
      { accountId: ACCOUNT_ID, invoiceId: first.id },
      context,
      toolkit,
    )

    expect(result.ok).toBe(true)
    if (result.ok) expect(result.value.invoice.id).toBe(first.id)
  })

  test('answers not_found for an account with no invoices at all', async () => {
    const toolkit = createFakeAssistantToolkit()

    const result = await creditCardInvoiceTool.execute({ accountId: ACCOUNT_ID }, context, toolkit)

    expect(result.ok).toBe(false)
    if (!result.ok) expect((result.error as { code: string }).code).toBe('invoice_not_found')
  })

  test('carries the invoice`s items', async () => {
    const invoice = seedInvoice()
    const toolkit = createFakeAssistantToolkit({
      invoiceItemsByInvoiceId: {
        [invoice.id]: [
          {
            amountMinor: 10_000,
            description: 'Notebook 1/2',
            id: generateEntityId(),
            installmentNumber: 1,
            occurredOn: '2026-08-05',
          },
        ],
      },
      invoices: [invoice],
    })

    const result = await creditCardInvoiceTool.execute({ accountId: ACCOUNT_ID }, context, toolkit)

    expect(result.ok).toBe(true)
    if (result.ok) expect(result.value.items).toHaveLength(1)
  })
})
