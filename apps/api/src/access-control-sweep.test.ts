import { describe, expect, test } from 'bun:test'

import { type CreateAppDependencies, createApp } from './app'
import type { ActorResolution } from './features/auth'
import { createFakeIdempotencyStore } from './features/credit-cards/credit-cards-test-support'
import { createFakeWorkspaceSettingsRepository } from './features/settings/settings-test-support'

/**
 * Fase 04 § Riscos: "`viewer` vazando por rota esquecida" needs a sweep, not
 * a hand-maintained checklist - this enumerates every write route Elysia
 * actually registered under the financial prefixes from `app.routes` itself,
 * the same composition `server.ts` boots (Decision 003's dependency
 * threading makes overriding just `resolveActor`, not every repository,
 * enough: `requireFinancialWriteAccess` is the first statement in every
 * write use case, so a viewer never reaches a *domain* repository call at
 * all - a create-account or an installment purchase still reads workspace
 * settings first, to resolve the currency or "today" the command needs
 * before the use case ever runs, but that read is RLS-protected and no more
 * privileged than the settings GET route every role can already call).
 *
 * A route with no entry in `REQUEST_FIXTURES` fails loudly instead of being
 * silently skipped - the failure mode this sweep exists to catch.
 */
const viewer: ActorResolution = {
  ok: true,
  context: {
    organizationId: 'org_sweep',
    organizationName: 'Sweep Org',
    organizationSlug: 'sweep-org',
    role: 'viewer',
    userId: 'user_sweep',
  },
}

const resolveActor = async () => viewer

const dependencies: CreateAppDependencies = {
  accounts: { resolveActor, settingsRepository: createFakeWorkspaceSettingsRepository() },
  categories: { resolveActor },
  // The idempotency store is real by default; a fake one keeps `pay`'s
  // envelope from making its own write attempt against a workspace this
  // sweep never actually creates.
  creditCards: {
    idempotencyStore: createFakeIdempotencyStore(),
    resolveActor,
    settingsRepository: createFakeWorkspaceSettingsRepository(),
  },
  // `POST /api/transactions` requires the header too now (Fase 06 audit,
  // NFR-05) - `withIdempotency` claims the key before the use case's own
  // role check ever runs, so this needs the same fake the credit-cards
  // envelope does.
  transactions: { idempotencyStore: createFakeIdempotencyStore(), resolveActor },
}

const app = createApp(dependencies)

const FINANCIAL_PREFIXES = [
  '/api/accounts',
  '/api/categories',
  '/api/credit-cards',
  '/api/invoices',
  '/api/transactions',
]
const WRITE_METHODS = new Set(['DELETE', 'PATCH', 'POST', 'PUT'])

type RequestFixture = { body?: unknown; headers?: Record<string, string> }

/**
 * A schema-valid body per route (Elysia validates the body before the
 * handler runs; an invalid one would answer `400`, not the `403` this sweep
 * is proving) - keyed by `${method} ${path}` using Elysia's own `:param`
 * route syntax, so the key is stable across the placeholder values used at
 * request time.
 */
const REQUEST_FIXTURES: Record<string, RequestFixture> = {
  'DELETE /api/transactions/:id': {},
  'PATCH /api/accounts/:id': { body: { version: 1 } },
  'PATCH /api/categories/:id': { body: { version: 1 } },
  'PATCH /api/transactions/:id': {
    body: {
      accountId: 'acc_sweep',
      amountMinor: 100,
      categoryId: 'cat_sweep',
      description: 'Sweep',
      kind: 'expense',
      occurredOn: '2026-01-01',
      version: 1,
    },
  },
  'POST /api/accounts': { body: { kind: 'checking', name: 'Sweep' } },
  'POST /api/accounts/:id/archive': {},
  'POST /api/accounts/:id/credit-card': {
    body: { closingDay: 10, dueDay: 20, limitMinor: 100_000 },
  },
  'POST /api/categories': { body: { kind: 'expense', name: 'Sweep' } },
  'POST /api/categories/:id/reassign': { body: {} },
  'POST /api/invoices/:id/close': {},
  'POST /api/invoices/:id/pay': {
    body: { fromAccountId: 'acc_sweep' },
    headers: { 'idempotency-key': 'sweep-key' },
  },
  'POST /api/transactions': {
    body: {
      accountId: 'acc_sweep',
      amountMinor: 100,
      categoryId: 'cat_sweep',
      description: 'Sweep',
      kind: 'expense',
      occurredOn: '2026-01-01',
    },
    headers: { 'idempotency-key': 'sweep-key' },
  },
  'POST /api/transactions/installments': {
    body: {
      accountId: 'acc_sweep',
      categoryId: 'cat_sweep',
      description: 'Sweep',
      firstOccurredOn: '2026-01-01',
      installments: 2,
      totalMinor: 1_000,
    },
    headers: { 'idempotency-key': 'sweep-key' },
  },
}

const toRequestPath = (routePath: string): string =>
  routePath.replace(/:[A-Za-z0-9_]+/g, 'sweep_id')

const writeRoutes = app.routes.filter(
  (route) =>
    WRITE_METHODS.has(route.method) &&
    FINANCIAL_PREFIXES.some((prefix) => route.path.startsWith(prefix)),
)

describe('financial write routes deny a viewer', () => {
  test('the sweep actually found the financial write routes (not vacuously empty)', () => {
    expect(writeRoutes.length).toBeGreaterThanOrEqual(13)
  })

  for (const route of writeRoutes) {
    // Elysia records a bare-prefix route's path with a trailing slash
    // (`/api/accounts/`); the fixture keys use the slash-free form every
    // other route already has, so both look the same here.
    const normalizedPath = route.path.length > 1 ? route.path.replace(/\/$/, '') : route.path
    const key = `${route.method} ${normalizedPath}`

    test(`${key} answers 403 for a read-only viewer`, async () => {
      const fixture = REQUEST_FIXTURES[key]
      if (!fixture) {
        throw new Error(
          `No request fixture for "${key}". A new financial write route needs one here, proving a viewer is denied - that is the whole point of this sweep.`,
        )
      }

      const response = await app.handle(
        new Request(`http://localhost${toRequestPath(route.path)}`, {
          body: fixture.body !== undefined ? JSON.stringify(fixture.body) : undefined,
          headers: { 'content-type': 'application/json', ...fixture.headers },
          method: route.method,
        }),
      )

      expect(response.status).toBe(403)
    })
  }
})
