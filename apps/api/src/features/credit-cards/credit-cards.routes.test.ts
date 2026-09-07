import { describe, expect, test } from 'bun:test'
import { generateEntityId } from '@fifilo/core/primitives'
import { Elysia } from 'elysia'

import type { ActorResolution } from '../auth'
import { createFakeWorkspaceSettingsRepository } from '../settings/settings-test-support'
import {
  createFakeAccountLookup,
  createFakeCategoryLookup,
  createFakeTransactionRepository,
  seedActiveAccount,
  seedActiveCategory,
} from '../transactions/transactions-test-support'
import { createCreditCardRoutes } from './credit-cards.routes'
import {
  createFakeCardAccountLookup,
  createFakeCreditCardRepository,
  createFakeIdempotencyStore,
  createFakeInstallmentPlanRepository,
  createFakeInvoiceRepository,
  seedCardAccount,
  seedCreditCard,
  seedInvoice,
} from './credit-cards-test-support'

const ORG_A = 'org_a'

const actor: ActorResolution = {
  ok: true,
  context: {
    organizationId: ORG_A,
    organizationName: 'Org A',
    organizationSlug: 'org-a',
    role: 'owner',
    userId: 'user_1',
  },
}

const unauthenticated: ActorResolution = {
  ok: false,
  status: 401,
  code: 'unauthenticated',
  message: 'Authentication required.',
}

const request = (
  routes: ReturnType<typeof createCreditCardRoutes>,
  path: string,
  init?: RequestInit,
) => new Elysia().use(routes).handle(new Request(`http://localhost${path}`, init))

const jsonRequest = (
  body: unknown,
  method = 'POST',
  headers: Record<string, string> = {},
): RequestInit => ({
  body: JSON.stringify(body),
  headers: { 'content-type': 'application/json', ...headers },
  method,
})

describe('credit card routes', () => {
  test('POST /api/accounts/:id/credit-card answers 401 without a session', async () => {
    const routes = createCreditCardRoutes({ resolveActor: async () => unauthenticated })
    const response = await request(
      routes,
      '/api/accounts/acc_1/credit-card',
      jsonRequest({ closingDay: 10, dueDay: 20, limitMinor: 500_000 }),
    )

    expect(response.status).toBe(401)
  })

  test('POST /api/accounts/:id/credit-card attaches details to a credit card account', async () => {
    const accountId = generateEntityId()
    const cardAccountLookup = createFakeCardAccountLookup([seedCardAccount({ id: accountId })])
    const creditCardRepository = createFakeCreditCardRepository()
    const routes = createCreditCardRoutes({
      cardAccountLookup,
      creditCardRepository,
      resolveActor: async () => actor,
    })

    const response = await request(
      routes,
      `/api/accounts/${accountId}/credit-card`,
      jsonRequest({ closingDay: 10, dueDay: 20, limitMinor: 500_000 }),
    )

    expect(response.status).toBe(201)
    const body = (await response.json()) as { accountId: string; limitMinor: number }
    expect(body.accountId).toBe(accountId)
    expect(body.limitMinor).toBe(500_000)
  })

  test('POST /api/accounts/:id/credit-card answers 400 for a non-card account', async () => {
    const accountId = generateEntityId()
    const cardAccountLookup = createFakeCardAccountLookup([
      seedCardAccount({ id: accountId, kind: 'checking' }),
    ])
    const routes = createCreditCardRoutes({ cardAccountLookup, resolveActor: async () => actor })

    const response = await request(
      routes,
      `/api/accounts/${accountId}/credit-card`,
      jsonRequest({ closingDay: 10, dueDay: 20, limitMinor: 500_000 }),
    )

    expect(response.status).toBe(400)
  })

  test('GET /api/credit-cards/:id/available-limit subtracts unpaid closed invoices from the limit', async () => {
    const accountId = generateEntityId()
    const cardAccountLookup = createFakeCardAccountLookup([seedCardAccount({ id: accountId })])
    const accountLookup = createFakeAccountLookup([seedActiveAccount({ id: accountId })])
    const creditCardRepository = createFakeCreditCardRepository([
      seedCreditCard({ accountId, limitMinor: 100_000, organizationId: ORG_A }),
    ])
    const invoiceRepository = createFakeInvoiceRepository([
      seedInvoice({ accountId, organizationId: ORG_A, status: 'closed', totalMinor: 30_000 }),
    ])
    const routes = createCreditCardRoutes({
      accountLookup,
      cardAccountLookup,
      creditCardRepository,
      invoiceRepository,
      resolveActor: async () => actor,
    })

    const response = await request(routes, `/api/credit-cards/${accountId}/available-limit`)

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ amountMinor: 70_000, currency: 'BRL' })
  })

  test('GET /api/credit-cards/:id/invoices lists the account`s invoices', async () => {
    const accountId = generateEntityId()
    const invoiceRepository = createFakeInvoiceRepository([
      seedInvoice({ accountId, organizationId: ORG_A }),
    ])
    const routes = createCreditCardRoutes({
      invoiceRepository,
      resolveActor: async () => actor,
      settingsRepository: createFakeWorkspaceSettingsRepository(),
    })

    const response = await request(routes, `/api/credit-cards/${accountId}/invoices`)

    expect(response.status).toBe(200)
    const body = (await response.json()) as unknown[]
    expect(body).toHaveLength(1)
  })

  test('GET /api/credit-cards/:id/invoices/:invoiceId answers 404 for an unknown invoice', async () => {
    const routes = createCreditCardRoutes({
      resolveActor: async () => actor,
      settingsRepository: createFakeWorkspaceSettingsRepository(),
    })

    const response = await request(routes, '/api/credit-cards/acc_1/invoices/inv_unknown')

    expect(response.status).toBe(404)
  })

  test('POST /api/invoices/:id/close closes an open invoice and is idempotent on a second call', async () => {
    const invoice = seedInvoice({ organizationId: ORG_A })
    const invoiceRepository = createFakeInvoiceRepository([invoice])
    const routes = createCreditCardRoutes({ invoiceRepository, resolveActor: async () => actor })

    const first = await request(routes, `/api/invoices/${invoice.id}/close`, { method: 'POST' })
    expect(first.status).toBe(200)
    const firstBody = (await first.json()) as { status: string }
    expect(firstBody.status).toBe('closed')

    const second = await request(routes, `/api/invoices/${invoice.id}/close`, { method: 'POST' })
    expect(second.status).toBe(200)
    const secondBody = (await second.json()) as { status: string }
    expect(secondBody.status).toBe('closed')
  })

  test('POST /api/invoices/:id/pay answers 400 without an Idempotency-Key', async () => {
    const invoice = seedInvoice({ organizationId: ORG_A, status: 'closed', totalMinor: 12_000 })
    const invoiceRepository = createFakeInvoiceRepository([invoice])
    const routes = createCreditCardRoutes({ invoiceRepository, resolveActor: async () => actor })

    const response = await request(
      routes,
      `/api/invoices/${invoice.id}/pay`,
      jsonRequest({ fromAccountId: 'acc_checking' }),
    )

    expect(response.status).toBe(400)
  })

  test('POST /api/invoices/:id/pay pays once and replays the same result for a repeated key', async () => {
    const cardAccountId = generateEntityId()
    const checkingId = generateEntityId()
    const invoice = seedInvoice({
      accountId: cardAccountId,
      organizationId: ORG_A,
      status: 'closed',
      totalMinor: 12_000,
    })
    const invoiceRepository = createFakeInvoiceRepository([invoice])
    const cardAccountLookup = createFakeCardAccountLookup([seedCardAccount({ id: cardAccountId })])
    const accountLookup = createFakeAccountLookup([
      seedActiveAccount({ id: checkingId }),
      seedActiveAccount({ id: cardAccountId }),
    ])
    const transactionRepository = createFakeTransactionRepository()
    const events: unknown[] = []
    const routes = createCreditCardRoutes({
      accountLookup,
      auditEvent: (event) => events.push(event),
      cardAccountLookup,
      idempotencyStore: createFakeIdempotencyStore(),
      invoiceRepository,
      resolveActor: async () => actor,
      settingsRepository: createFakeWorkspaceSettingsRepository(),
      transactionRepository,
    })

    const headers = { 'idempotency-key': 'pay-key-1' }
    const first = await request(
      routes,
      `/api/invoices/${invoice.id}/pay`,
      jsonRequest({ fromAccountId: checkingId }, 'POST', headers),
    )
    expect(first.status).toBe(200)
    const firstBody = (await first.json()) as { status: string }
    expect(firstBody.status).toBe('paid')

    const second = await request(
      routes,
      `/api/invoices/${invoice.id}/pay`,
      jsonRequest({ fromAccountId: checkingId }, 'POST', headers),
    )
    expect(second.status).toBe(200)
    expect(await second.json()).toEqual(firstBody)

    // The audit event fires from inside `execute`, which the replayed second
    // call never re-runs (Fase 04 § Modelagem: one event per real payment).
    expect(events).toHaveLength(1)
    expect(events[0]).toMatchObject({ action: 'invoice.paid', entityId: invoice.id })
  })

  test('POST /api/transactions/installments creates the plan`s transactions', async () => {
    const accountId = generateEntityId()
    const categoryId = generateEntityId()
    const cardAccountLookup = createFakeCardAccountLookup([seedCardAccount({ id: accountId })])
    const categoryLookup = createFakeCategoryLookup([seedActiveCategory({ id: categoryId })])
    const creditCardRepository = createFakeCreditCardRepository([
      seedCreditCard({ accountId, organizationId: ORG_A }),
    ])
    const installmentPlanRepository = createFakeInstallmentPlanRepository()
    const invoiceRepository = createFakeInvoiceRepository()
    const routes = createCreditCardRoutes({
      cardAccountLookup,
      categoryLookup,
      creditCardRepository,
      idempotencyStore: createFakeIdempotencyStore(),
      installmentPlanRepository,
      invoiceRepository,
      resolveActor: async () => actor,
      settingsRepository: createFakeWorkspaceSettingsRepository(),
    })

    const response = await request(
      routes,
      '/api/transactions/installments',
      jsonRequest(
        {
          accountId,
          categoryId,
          description: 'Notebook',
          firstOccurredOn: '2026-06-05',
          installments: 3,
          totalMinor: 10_000,
        },
        'POST',
        { 'idempotency-key': 'installments-key' },
      ),
    )

    expect(response.status).toBe(201)
    const body = (await response.json()) as { transactionIds: string[] }
    expect(body.transactionIds).toHaveLength(3)
  })

  test('POST /api/transactions/installments answers 400 without an Idempotency-Key (Fase 06 audit, NFR-05)', async () => {
    const routes = createCreditCardRoutes({ resolveActor: async () => actor })

    const response = await request(
      routes,
      '/api/transactions/installments',
      jsonRequest({
        accountId: generateEntityId(),
        categoryId: generateEntityId(),
        description: 'Sem chave',
        firstOccurredOn: '2026-06-05',
        installments: 2,
        totalMinor: 10_000,
      }),
    )

    expect(response.status).toBe(400)
    const body = (await response.json()) as { error: { code: string } }
    expect(body.error.code).toBe('idempotency_key_required')
  })
})
