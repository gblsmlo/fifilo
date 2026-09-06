import { describe, expect, test } from 'bun:test'
import { generateEntityId } from '@fifilo/core/primitives'
import { Elysia } from 'elysia'

import type { ActorResolution } from '../auth'
import { createAnalyticsRoutes } from './analytics.routes'
import { createFakeAnalyticsReader } from './analytics-test-support'

const ORG_A = 'org_a'

const actor: ActorResolution = {
  ok: true,
  context: {
    organizationId: ORG_A,
    organizationName: 'Org A',
    organizationSlug: 'org-a',
    role: 'viewer',
    userId: 'user_1',
  },
}

const request = (routes: ReturnType<typeof createAnalyticsRoutes>, path: string) =>
  new Elysia().use(routes).handle(new Request(`http://localhost${path}`))

describe('analytics routes', () => {
  test('a viewer can read every projection - reading is not a financial write', async () => {
    const routes = createAnalyticsRoutes({
      analyticsReader: createFakeAnalyticsReader({
        monthlyCashflow: [{ expenseMinor: 3_000, incomeMinor: 5_000, month: '2026-01' }],
      }),
      resolveActor: async () => actor,
    })

    const response = await request(
      routes,
      '/api/analytics/monthly-cashflow?from=2026-01-01&to=2026-01-31',
    )

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual([
      { expenseMinor: 3_000, incomeMinor: 5_000, month: '2026-01' },
    ])
  })

  test('GET /monthly-cashflow sets a private, must-revalidate Cache-Control and an ETag', async () => {
    const routes = createAnalyticsRoutes({
      analyticsReader: createFakeAnalyticsReader({
        monthlyCashflow: [{ expenseMinor: 3_000, incomeMinor: 5_000, month: '2026-01' }],
      }),
      resolveActor: async () => actor,
    })

    const response = await request(
      routes,
      '/api/analytics/monthly-cashflow?from=2026-01-01&to=2026-01-31',
    )

    expect(response.headers.get('cache-control')).toBe('private, max-age=0, must-revalidate')
    expect(response.headers.get('etag')).toBeTruthy()
  })

  test('GET /monthly-cashflow rejects an inverted range with 400', async () => {
    const routes = createAnalyticsRoutes({
      analyticsReader: createFakeAnalyticsReader(),
      resolveActor: async () => actor,
    })

    const response = await request(
      routes,
      '/api/analytics/monthly-cashflow?from=2026-02-01&to=2026-01-01',
    )

    expect(response.status).toBe(400)
    const body = (await response.json()) as { error: { code: string } }
    expect(body.error.code).toBe('invalid_date_range')
  })

  test('GET /spend-by-category returns each category`s share of the period', async () => {
    const categoryId = generateEntityId()
    const routes = createAnalyticsRoutes({
      analyticsReader: createFakeAnalyticsReader({
        spendByCategory: [
          { categoryId, categoryName: 'Mercado', parentId: null, totalMinor: 10_000 },
        ],
      }),
      resolveActor: async () => actor,
    })

    const response = await request(
      routes,
      '/api/analytics/spend-by-category?from=2026-01-01&to=2026-01-31&kind=expense',
    )

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual([
      { categoryId, categoryName: 'Mercado', parentId: null, percentage: 100, totalMinor: 10_000 },
    ])
  })

  test('GET /spend-by-account returns cash and card rows together', async () => {
    const accountId = generateEntityId()
    const routes = createAnalyticsRoutes({
      analyticsReader: createFakeAnalyticsReader({
        spendByAccount: [
          { accountId, accountName: 'Conta corrente', kind: 'checking', totalMinor: 4_000 },
        ],
      }),
      resolveActor: async () => actor,
    })

    const response = await request(
      routes,
      '/api/analytics/spend-by-account?from=2026-01-01&to=2026-01-31',
    )

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual([
      { accountId, accountName: 'Conta corrente', kind: 'checking', totalMinor: 4_000 },
    ])
  })

  test('GET /balance-evolution returns per-account and consolidated series', async () => {
    const accountId = generateEntityId()
    const routes = createAnalyticsRoutes({
      analyticsReader: createFakeAnalyticsReader({
        balanceEvolution: {
          accounts: [{ accountId, points: [{ balanceMinor: 1_000, date: '2026-01-01' }] }],
          consolidated: [{ balanceMinor: 1_000, date: '2026-01-01' }],
        },
      }),
      resolveActor: async () => actor,
    })

    const response = await request(
      routes,
      '/api/analytics/balance-evolution?from=2026-01-01&to=2026-01-31',
    )

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({
      accounts: [{ accountId, points: [{ balanceMinor: 1_000, date: '2026-01-01' }] }],
      consolidated: [{ balanceMinor: 1_000, date: '2026-01-01' }],
    })
  })

  test('GET /consolidated-balance nets available cash against committed invoices', async () => {
    const routes = createAnalyticsRoutes({
      analyticsReader: createFakeAnalyticsReader({
        consolidatedBalance: { availableCashMinor: 100_000, committedInvoiceMinor: 30_000 },
      }),
      resolveActor: async () => actor,
    })

    const response = await request(routes, '/api/analytics/consolidated-balance?asOf=2026-01-31')

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({
      availableCashMinor: 100_000,
      committedInvoiceMinor: 30_000,
      netMinor: 70_000,
    })
  })

  test('GET /top-expenses returns the N largest expenses', async () => {
    const transactionId = generateEntityId()
    const routes = createAnalyticsRoutes({
      analyticsReader: createFakeAnalyticsReader({
        topExpenses: [
          {
            amountMinor: 50_000,
            categoryName: 'Viagem',
            description: 'Passagem aérea',
            occurredOn: '2026-01-10',
            transactionId,
          },
        ],
      }),
      resolveActor: async () => actor,
    })

    const response = await request(
      routes,
      '/api/analytics/top-expenses?from=2026-01-01&to=2026-01-31&limit=5',
    )

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual([
      {
        amountMinor: 50_000,
        categoryName: 'Viagem',
        description: 'Passagem aérea',
        occurredOn: '2026-01-10',
        transactionId,
      },
    ])
  })

  test('an unauthenticated request is rejected before reaching the reader', async () => {
    const routes = createAnalyticsRoutes({
      analyticsReader: createFakeAnalyticsReader(),
      resolveActor: async () => ({
        ok: false,
        status: 401,
        code: 'unauthenticated',
        message: 'Authentication required.',
      }),
    })

    const response = await request(
      routes,
      '/api/analytics/monthly-cashflow?from=2026-01-01&to=2026-01-31',
    )

    expect(response.status).toBe(401)
  })
})
