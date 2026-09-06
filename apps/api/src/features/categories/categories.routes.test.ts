import { describe, expect, test } from 'bun:test'
import type { Category } from '@fifilo/core/categories'
import { generateEntityId } from '@fifilo/core/primitives'
import { Elysia } from 'elysia'

import type { ActorResolution } from '../auth'
import { createCategoryRoutes } from './categories.routes'
import { createFakeCategoryRepository } from './categories-test-support'

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
  routes: ReturnType<typeof createCategoryRoutes>,
  path: string,
  init?: RequestInit,
) => new Elysia().use(routes).handle(new Request(`http://localhost/api/categories${path}`, init))

const jsonRequest = (body: unknown, method = 'POST'): RequestInit => ({
  body: JSON.stringify(body),
  headers: { 'content-type': 'application/json' },
  method,
})

const seedCategory = (overrides: Partial<Category> = {}): Category => ({
  archivedAt: null,
  color: null,
  createdAt: new Date(),
  icon: null,
  id: generateEntityId(),
  kind: 'expense' as const,
  name: 'Mercado',
  organizationId: 'org_a',
  parentId: null,
  updatedAt: new Date(),
  version: 1,
  ...overrides,
})

describe('categories routes', () => {
  test('GET / answers 401 without a session', async () => {
    const routes = createCategoryRoutes({ resolveActor: async () => unauthenticated })
    const response = await request(routes, '')

    expect(response.status).toBe(401)
  })

  test('POST / creates a category and answers 201', async () => {
    const categoryRepository = createFakeCategoryRepository()
    const routes = createCategoryRoutes({ categoryRepository, resolveActor: async () => actor })

    const response = await request(routes, '', jsonRequest({ kind: 'expense', name: 'Mercado' }))

    expect(response.status).toBe(201)
    const body = (await response.json()) as { name: string; organizationId: string }
    expect(body.name).toBe('Mercado')
    expect(body.organizationId).toBe('org_a')
  })

  test('POST / answers 409 for a name already used in the same scope', async () => {
    const categoryRepository = createFakeCategoryRepository()
    const routes = createCategoryRoutes({ categoryRepository, resolveActor: async () => actor })

    await request(routes, '', jsonRequest({ kind: 'expense', name: 'Mercado' }))
    const response = await request(routes, '', jsonRequest({ kind: 'expense', name: 'mercado' }))

    expect(response.status).toBe(409)
    expect(await response.json()).toEqual({
      error: { code: 'category_name_taken', message: 'This category name is already in use.' },
    })
  })

  test('POST / answers 400 when a subcategory`s kind diverges from its parent', async () => {
    const parent = seedCategory({ kind: 'income', name: 'Salário' })
    const categoryRepository = createFakeCategoryRepository([parent])
    const routes = createCategoryRoutes({ categoryRepository, resolveActor: async () => actor })

    const response = await request(
      routes,
      '',
      jsonRequest({ kind: 'expense', name: 'Bônus', parentId: parent.id }),
    )

    expect(response.status).toBe(400)
    expect(await response.json()).toEqual({
      error: {
        code: 'invalid_category_kind',
        message: 'A subcategory must have the same kind as its parent.',
      },
    })
  })

  test('GET / lists only this workspace`s categories', async () => {
    const mine = seedCategory({ name: 'Mine' })
    const theirs = seedCategory({ id: generateEntityId(), name: 'Theirs', organizationId: 'org_b' })
    const categoryRepository = createFakeCategoryRepository([mine, theirs])
    const routes = createCategoryRoutes({ categoryRepository, resolveActor: async () => actor })

    const response = await request(routes, '')

    expect(response.status).toBe(200)
    const body = (await response.json()) as Array<{ name: string }>
    expect(body.map((category) => category.name)).toEqual(['Mine'])
  })

  test('PATCH /:id answers 409 on a stale version', async () => {
    const category = seedCategory()
    const categoryRepository = createFakeCategoryRepository([category])
    const routes = createCategoryRoutes({ categoryRepository, resolveActor: async () => actor })

    const response = await request(
      routes,
      `/${category.id}`,
      jsonRequest({ name: 'Novo nome', version: 99 }, 'PATCH'),
    )

    expect(response.status).toBe(409)
  })

  test('POST /:id/reassign archives a category with no transactions', async () => {
    const category = seedCategory()
    const categoryRepository = createFakeCategoryRepository([category])
    const routes = createCategoryRoutes({ categoryRepository, resolveActor: async () => actor })

    const response = await request(routes, `/${category.id}/reassign`, jsonRequest({}))

    expect(response.status).toBe(200)
    const body = (await response.json()) as { archivedAt: string | null }
    expect(body.archivedAt).not.toBeNull()
  })

  test('POST /:id/reassign answers 400 when a target is required but missing', async () => {
    const category = seedCategory()
    const categoryRepository = createFakeCategoryRepository([category])
    categoryRepository.transactionCountsById.set(category.id, 3)
    const routes = createCategoryRoutes({ categoryRepository, resolveActor: async () => actor })

    const response = await request(routes, `/${category.id}/reassign`, jsonRequest({}))

    expect(response.status).toBe(400)
    expect(await response.json()).toEqual({
      error: {
        code: 'target_category_required',
        message: 'Choose a category to move existing transactions to.',
      },
    })
  })

  test('POST /:id/reassign moves transactions onto the target and archives the source', async () => {
    const source = seedCategory({ name: 'Antiga' })
    const target = seedCategory({ id: generateEntityId(), name: 'Nova' })
    const categoryRepository = createFakeCategoryRepository([source, target])
    categoryRepository.transactionCountsById.set(source.id, 3)
    const routes = createCategoryRoutes({ categoryRepository, resolveActor: async () => actor })

    const response = await request(
      routes,
      `/${source.id}/reassign`,
      jsonRequest({ targetCategoryId: target.id }),
    )

    expect(response.status).toBe(200)
    expect(categoryRepository.transactionCountsById.get(target.id)).toBe(3)
    expect(categoryRepository.transactionCountsById.get(source.id)).toBe(0)
  })

  test('POST /:id/reassign records an audit event only for the bulk move, not a plain archive', async () => {
    const emptyCategory = seedCategory({ name: 'Vazia' })
    const source = seedCategory({ id: generateEntityId(), name: 'Antiga' })
    const target = seedCategory({ id: generateEntityId(), name: 'Nova' })
    const categoryRepository = createFakeCategoryRepository([emptyCategory, source, target])
    categoryRepository.transactionCountsById.set(source.id, 2)
    const events: unknown[] = []
    const routes = createCategoryRoutes({
      auditEvent: (event) => events.push(event),
      categoryRepository,
      resolveActor: async () => actor,
    })

    await request(routes, `/${emptyCategory.id}/reassign`, jsonRequest({}))
    expect(events).toHaveLength(0)

    await request(routes, `/${source.id}/reassign`, jsonRequest({ targetCategoryId: target.id }))

    expect(events).toEqual([
      {
        action: 'category.reassigned',
        actorId: 'user_1',
        actorType: 'user',
        afterRef: target.id,
        beforeRef: source.id,
        entityId: source.id,
        entityType: 'category',
        workspaceId: 'org_a',
      },
    ])
  })
})
