import { describe, expect, test } from 'bun:test'
import { generateEntityId } from '@fifilo/core/primitives'
import { Elysia } from 'elysia'

import type { ActorResolution } from '../auth'
import { createTransactionRoutes } from './transactions.routes'
import {
  createFakeAccountLookup,
  createFakeCategoryLookup,
  createFakeTransactionRepository,
  seedActiveAccount,
  seedActiveCategory,
} from './transactions-test-support'

const actor: ActorResolution = {
  ok: true,
  context: {
    organizationId: 'org_a',
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
  routes: ReturnType<typeof createTransactionRoutes>,
  path: string,
  init?: RequestInit,
) => new Elysia().use(routes).handle(new Request(`http://localhost/api/transactions${path}`, init))

const jsonRequest = (body: unknown, method = 'POST'): RequestInit => ({
  body: JSON.stringify(body),
  headers: { 'content-type': 'application/json' },
  method,
})

describe('transactions routes', () => {
  test('GET / answers 401 without a session', async () => {
    const routes = createTransactionRoutes({ resolveActor: async () => unauthenticated })
    const response = await request(routes, '')

    expect(response.status).toBe(401)
  })

  test('POST / creates an expense and answers 201 with a single negative leg', async () => {
    const account = seedActiveAccount({ id: generateEntityId() })
    const category = seedActiveCategory({ id: generateEntityId(), kind: 'expense' })
    const routes = createTransactionRoutes({
      accountLookup: createFakeAccountLookup([account]),
      categoryLookup: createFakeCategoryLookup([category]),
      resolveActor: async () => actor,
      transactionRepository: createFakeTransactionRepository(),
    })

    const response = await request(
      routes,
      '',
      jsonRequest({
        accountId: account.id,
        amountMinor: 5_000,
        categoryId: category.id,
        description: 'Supermercado',
        kind: 'expense',
        occurredOn: '2026-01-15',
      }),
    )

    expect(response.status).toBe(201)
    const body = (await response.json()) as {
      legs: Array<{ accountId: string; amountMinor: number }>
    }
    expect(body.legs).toEqual([{ accountId: account.id, amountMinor: -5_000 }])
  })

  test('POST / creates a transfer and answers 201 with two zero-sum legs', async () => {
    const from = seedActiveAccount({ id: generateEntityId() })
    const to = seedActiveAccount({ id: generateEntityId() })
    const routes = createTransactionRoutes({
      accountLookup: createFakeAccountLookup([from, to]),
      resolveActor: async () => actor,
      transactionRepository: createFakeTransactionRepository(),
    })

    const response = await request(
      routes,
      '',
      jsonRequest({
        amountMinor: 2_000,
        description: 'Transferência',
        fromAccountId: from.id,
        kind: 'transfer',
        occurredOn: '2026-01-15',
        toAccountId: to.id,
      }),
    )

    expect(response.status).toBe(201)
    const body = (await response.json()) as {
      legs: Array<{ accountId: string; amountMinor: number }>
    }
    expect(body.legs).toEqual([
      { accountId: from.id, amountMinor: -2_000 },
      { accountId: to.id, amountMinor: 2_000 },
    ])
    expect(body.legs.reduce((sum, leg) => sum + leg.amountMinor, 0)).toBe(0)
  })

  test('POST / answers 400 for a transfer between the same account', async () => {
    const account = seedActiveAccount({ id: generateEntityId() })
    const routes = createTransactionRoutes({
      accountLookup: createFakeAccountLookup([account]),
      resolveActor: async () => actor,
    })

    const response = await request(
      routes,
      '',
      jsonRequest({
        amountMinor: 2_000,
        description: 'Transferência',
        fromAccountId: account.id,
        kind: 'transfer',
        occurredOn: '2026-01-15',
        toAccountId: account.id,
      }),
    )

    expect(response.status).toBe(400)
  })

  test('POST / answers 409 when the category kind does not match the transaction kind', async () => {
    const account = seedActiveAccount({ id: generateEntityId() })
    const category = seedActiveCategory({ id: generateEntityId(), kind: 'income' })
    const routes = createTransactionRoutes({
      accountLookup: createFakeAccountLookup([account]),
      categoryLookup: createFakeCategoryLookup([category]),
      resolveActor: async () => actor,
    })

    const response = await request(
      routes,
      '',
      jsonRequest({
        accountId: account.id,
        amountMinor: 5_000,
        categoryId: category.id,
        description: 'Supermercado',
        kind: 'expense',
        occurredOn: '2026-01-15',
      }),
    )

    expect(response.status).toBe(400)
    expect(await response.json()).toEqual({
      error: {
        code: 'category_kind_mismatch',
        message: 'The category kind must match the transaction kind.',
      },
    })
  })

  test('POST / answers 409 for an archived category', async () => {
    const account = seedActiveAccount({ id: generateEntityId() })
    const category = seedActiveCategory({
      archivedAt: new Date(),
      id: generateEntityId(),
      kind: 'expense',
    })
    const routes = createTransactionRoutes({
      accountLookup: createFakeAccountLookup([account]),
      categoryLookup: createFakeCategoryLookup([category]),
      resolveActor: async () => actor,
    })

    const response = await request(
      routes,
      '',
      jsonRequest({
        accountId: account.id,
        amountMinor: 5_000,
        categoryId: category.id,
        description: 'Supermercado',
        kind: 'expense',
        occurredOn: '2026-01-15',
      }),
    )

    expect(response.status).toBe(409)
    expect(await response.json()).toEqual({
      error: {
        code: 'category_archived',
        message: 'This category no longer accepts new transactions.',
      },
    })
  })

  test('POST / answers 404 for an unknown account', async () => {
    const routes = createTransactionRoutes({ resolveActor: async () => actor })

    const response = await request(
      routes,
      '',
      jsonRequest({
        accountId: generateEntityId(),
        amountMinor: 5_000,
        categoryId: generateEntityId(),
        description: 'Supermercado',
        kind: 'expense',
        occurredOn: '2026-01-15',
      }),
    )

    expect(response.status).toBe(404)
  })

  test('GET / lists only this workspace`s transactions', async () => {
    const account = seedActiveAccount({ id: generateEntityId() })
    const shared = {
      categoryId: null,
      createdAt: new Date(),
      createdBy: generateEntityId(),
      description: 'Mine',
      id: generateEntityId(),
      kind: 'expense' as const,
      legs: [{ accountId: account.id, amountMinor: -1_000 }],
      notes: null,
      occurredOn: '2026-01-10',
      organizationId: 'org_a',
      updatedAt: new Date(),
      version: 1,
    }
    const theirs = {
      ...shared,
      id: generateEntityId(),
      description: 'Theirs',
      organizationId: 'org_b',
    }
    const transactionRepository = createFakeTransactionRepository([shared, theirs])
    const routes = createTransactionRoutes({
      resolveActor: async () => actor,
      transactionRepository,
    })

    const response = await request(routes, '')

    expect(response.status).toBe(200)
    const body = (await response.json()) as { items: Array<{ description: string }> }
    expect(body.items.map((item) => item.description)).toEqual(['Mine'])
  })

  test('PATCH /:id answers 409 on a stale version', async () => {
    const account = seedActiveAccount({ id: generateEntityId() })
    const category = seedActiveCategory({ id: generateEntityId(), kind: 'expense' })
    const transaction = {
      categoryId: category.id,
      createdAt: new Date(),
      createdBy: generateEntityId(),
      description: 'Supermercado',
      id: generateEntityId(),
      kind: 'expense' as const,
      legs: [{ accountId: account.id, amountMinor: -5_000 }],
      notes: null,
      occurredOn: '2026-01-15',
      organizationId: 'org_a',
      updatedAt: new Date(),
      version: 1,
    }
    const routes = createTransactionRoutes({
      accountLookup: createFakeAccountLookup([account]),
      categoryLookup: createFakeCategoryLookup([category]),
      resolveActor: async () => actor,
      transactionRepository: createFakeTransactionRepository([transaction]),
    })

    const response = await request(
      routes,
      `/${transaction.id}`,
      jsonRequest(
        {
          accountId: account.id,
          amountMinor: 6_000,
          categoryId: category.id,
          description: 'Supermercado',
          kind: 'expense',
          occurredOn: '2026-01-15',
          version: 99,
        },
        'PATCH',
      ),
    )

    expect(response.status).toBe(409)
  })

  test('DELETE /:id removes the transaction and answers 200', async () => {
    const transaction = {
      categoryId: null,
      createdAt: new Date(),
      createdBy: generateEntityId(),
      description: 'Removível',
      id: generateEntityId(),
      kind: 'expense' as const,
      legs: [],
      notes: null,
      occurredOn: '2026-01-15',
      organizationId: 'org_a',
      updatedAt: new Date(),
      version: 1,
    }
    const routes = createTransactionRoutes({
      resolveActor: async () => actor,
      transactionRepository: createFakeTransactionRepository([transaction]),
    })

    const response = await request(routes, `/${transaction.id}`, { method: 'DELETE' })

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ success: true })
  })

  test('DELETE /:id answers 404 for an unknown id', async () => {
    const routes = createTransactionRoutes({ resolveActor: async () => actor })

    const response = await request(routes, `/${generateEntityId()}`, { method: 'DELETE' })

    expect(response.status).toBe(404)
  })
})
