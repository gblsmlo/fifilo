import { describe, expect, test } from 'bun:test'

import { generateEntityId } from '../../primitives'
import { createFakeCategoryLookup } from '../../transactions/use-cases/fake-transaction-repository'
import { createInstallmentPurchase } from './create-installment-purchase'
import {
  createFakeCardAccountLookup,
  createFakeCreditCardRepository,
} from './fake-credit-card-repository'
import { createFakeInstallmentPlanRepository } from './fake-installment-plan-repository'
import { createFakeInvoiceRepository } from './fake-invoice-repository'

const ORGANIZATION_ID = 'org_1'

describe('createInstallmentPurchase', () => {
  test('creates one transaction share per installment, each resolved to its own consecutive invoice', async () => {
    const accountId = generateEntityId()
    const categoryId = generateEntityId()
    const accounts = createFakeCardAccountLookup([
      { archivedAt: null, currency: 'BRL', id: accountId, kind: 'credit_card' },
    ])
    const categories = createFakeCategoryLookup([
      { archivedAt: null, id: categoryId, kind: 'expense' },
    ])
    const cards = createFakeCreditCardRepository()
    await cards.create({
      accountId,
      closingDay: 10,
      createdAt: new Date(),
      dueDay: 20,
      limitMinor: 500_000,
      organizationId: ORGANIZATION_ID,
    })
    const invoices = createFakeInvoiceRepository()
    const plans = createFakeInstallmentPlanRepository()

    const result = await createInstallmentPurchase(
      {
        accountId,
        categoryId,
        description: 'Notebook',
        firstOccurredOn: '2026-06-05',
        installments: 3,
        notes: null,
        organizationId: ORGANIZATION_ID,
        role: 'owner',
        today: '2026-06-05',
        totalMinor: 10_000,
        userId: generateEntityId(),
      },
      plans,
      cards,
      invoices,
      accounts,
      categories,
    )

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.value).toHaveLength(3)

    const shares = plans.sharesByPlanId.get(plans.plans[0]?.id ?? '') ?? []
    expect(shares.map((share) => share.amountMinor)).toEqual([-3_334, -3_333, -3_333])
    expect(shares.map((share) => share.installmentNumber)).toEqual([1, 2, 3])
    // Three consecutive cycles: the invoice ids are all different.
    expect(new Set(shares.map((share) => share.invoiceId)).size).toBe(3)
  })

  test('rejects a purchase on an account with no credit card details yet', async () => {
    const accountId = generateEntityId()
    const categoryId = generateEntityId()
    const accounts = createFakeCardAccountLookup([
      { archivedAt: null, currency: 'BRL', id: accountId, kind: 'credit_card' },
    ])
    const categories = createFakeCategoryLookup([
      { archivedAt: null, id: categoryId, kind: 'expense' },
    ])

    const result = await createInstallmentPurchase(
      {
        accountId,
        categoryId,
        description: 'Notebook',
        firstOccurredOn: '2026-06-05',
        installments: 3,
        notes: null,
        organizationId: ORGANIZATION_ID,
        role: 'owner',
        today: '2026-06-05',
        totalMinor: 10_000,
        userId: generateEntityId(),
      },
      createFakeInstallmentPlanRepository(),
      createFakeCreditCardRepository(),
      createFakeInvoiceRepository(),
      accounts,
      categories,
    )

    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error.code).toBe('credit_card_not_configured')
  })

  test('rejects an income category for a card purchase', async () => {
    const accountId = generateEntityId()
    const categoryId = generateEntityId()
    const accounts = createFakeCardAccountLookup([
      { archivedAt: null, currency: 'BRL', id: accountId, kind: 'credit_card' },
    ])
    const categories = createFakeCategoryLookup([
      { archivedAt: null, id: categoryId, kind: 'income' },
    ])
    const cards = createFakeCreditCardRepository()
    await cards.create({
      accountId,
      closingDay: 10,
      createdAt: new Date(),
      dueDay: 20,
      limitMinor: 500_000,
      organizationId: ORGANIZATION_ID,
    })

    const result = await createInstallmentPurchase(
      {
        accountId,
        categoryId,
        description: 'Notebook',
        firstOccurredOn: '2026-06-05',
        installments: 3,
        notes: null,
        organizationId: ORGANIZATION_ID,
        role: 'owner',
        today: '2026-06-05',
        totalMinor: 10_000,
        userId: generateEntityId(),
      },
      createFakeInstallmentPlanRepository(),
      cards,
      createFakeInvoiceRepository(),
      accounts,
      categories,
    )

    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error.code).toBe('category_kind_mismatch')
  })
})
