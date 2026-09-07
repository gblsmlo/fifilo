import { describe, expect, test } from 'bun:test'
import type { WorkspaceRole } from '@fifilo/core/access-control'
import { generateEntityId } from '@fifilo/core/primitives'
import { Elysia } from 'elysia'

import type { ActorResolution } from '../auth'
import { createExportRoutes } from './export.routes'
import { createFakeExportReader } from './export-test-support'

const ORG_A = 'org_a'

const actorWith = (role: WorkspaceRole): ActorResolution => ({
  ok: true,
  context: {
    organizationId: ORG_A,
    organizationName: 'Org A',
    organizationSlug: 'org-a',
    role,
    userId: 'user_1',
  },
})

const request = (routes: ReturnType<typeof createExportRoutes>, path: string) =>
  new Elysia().use(routes).handle(new Request(`http://localhost${path}`))

describe('export routes', () => {
  test('an owner downloads the CSV with a content-disposition header', async () => {
    const transactionId = generateEntityId()
    const routes = createExportRoutes({
      exportReader: createFakeExportReader([
        {
          accountName: 'Conta corrente',
          amountMinor: 5_000,
          categoryName: 'Mercado',
          currency: 'BRL',
          description: 'Compra',
          invoiceId: null,
          kind: 'expense',
          occurredOn: '2026-01-10',
          transactionId,
        },
      ]),
      resolveActor: async () => actorWith('owner'),
    })

    const response = await request(routes, '/api/export/transactions?from=2026-01-01&to=2026-01-31')

    expect(response.status).toBe(200)
    expect(response.headers.get('content-type')).toContain('text/csv')
    expect(response.headers.get('content-disposition')).toContain('attachment')
    expect(await response.text()).toContain('Compra')
  })

  test('an admin can export', async () => {
    const routes = createExportRoutes({
      exportReader: createFakeExportReader(),
      resolveActor: async () => actorWith('admin'),
    })

    const response = await request(routes, '/api/export/transactions?from=2026-01-01&to=2026-01-31')

    expect(response.status).toBe(200)
  })

  test.each(['member', 'viewer'] as const)('denies a %s with 403', async (role) => {
    const routes = createExportRoutes({
      exportReader: createFakeExportReader(),
      resolveActor: async () => actorWith(role),
    })

    const response = await request(routes, '/api/export/transactions?from=2026-01-01&to=2026-01-31')

    expect(response.status).toBe(403)
  })

  test('rejects an inverted range with 400', async () => {
    const routes = createExportRoutes({
      exportReader: createFakeExportReader(),
      resolveActor: async () => actorWith('owner'),
    })

    const response = await request(routes, '/api/export/transactions?from=2026-02-01&to=2026-01-01')

    expect(response.status).toBe(400)
  })

  test('an unauthenticated request is rejected before reaching the reader', async () => {
    const routes = createExportRoutes({
      exportReader: createFakeExportReader(),
      resolveActor: async () => ({
        ok: false,
        status: 401,
        code: 'unauthenticated',
        message: 'Authentication required.',
      }),
    })

    const response = await request(routes, '/api/export/transactions?from=2026-01-01&to=2026-01-31')

    expect(response.status).toBe(401)
  })
})
