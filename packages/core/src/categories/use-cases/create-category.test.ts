import { describe, expect, test } from 'bun:test'

import { generateEntityId } from '../../primitives'
import type { Category } from '../category'
import { createCategory } from './create-category'
import { createFakeCategoryRepository } from './fake-category-repository'

const seedParent = (overrides: Partial<Category> = {}): Category => ({
  archivedAt: null,
  color: null,
  createdAt: new Date('2026-01-01'),
  icon: null,
  id: generateEntityId(),
  kind: 'expense',
  name: 'Casa',
  organizationId: 'org_a',
  parentId: null,
  updatedAt: new Date('2026-01-01'),
  version: 1,
  ...overrides,
})

describe('createCategory', () => {
  test('creates a top-level category', async () => {
    const repository = createFakeCategoryRepository()

    const result = await createCategory(
      {
        color: null,
        icon: null,
        kind: 'expense',
        name: 'Transporte',
        organizationId: 'org_a',
        parentId: null,
      },
      repository,
    )

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.value.name).toBe('Transporte')
  })

  test('a subcategory inherits the parent kind', async () => {
    const parent = seedParent()
    const repository = createFakeCategoryRepository([parent])

    const result = await createCategory(
      {
        color: null,
        icon: null,
        kind: 'income',
        name: 'Aluguel',
        organizationId: 'org_a',
        parentId: parent.id,
      },
      repository,
    )

    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error.code).toBe('invalid_category_kind')
  })

  test('rejects nesting under a subcategory (one level only)', async () => {
    const parent = seedParent()
    const repository = createFakeCategoryRepository([parent])
    const child = await createCategory(
      {
        color: null,
        icon: null,
        kind: 'expense',
        name: 'Aluguel',
        organizationId: 'org_a',
        parentId: parent.id,
      },
      repository,
    )
    if (!child.ok) throw new Error('setup failed')

    const result = await createCategory(
      {
        color: null,
        icon: null,
        kind: 'expense',
        name: 'Condomínio',
        organizationId: 'org_a',
        parentId: child.value.id,
      },
      repository,
    )

    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error.code).toBe('invalid_category_kind')
  })

  test('rejects a duplicate name in the same parent and kind', async () => {
    const repository = createFakeCategoryRepository()
    await createCategory(
      {
        color: null,
        icon: null,
        kind: 'expense',
        name: 'Transporte',
        organizationId: 'org_a',
        parentId: null,
      },
      repository,
    )

    const result = await createCategory(
      {
        color: null,
        icon: null,
        kind: 'expense',
        name: 'transporte',
        organizationId: 'org_a',
        parentId: null,
      },
      repository,
    )

    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error.code).toBe('category_name_taken')
  })

  test('the same name is available under a different kind', async () => {
    const repository = createFakeCategoryRepository()
    await createCategory(
      {
        color: null,
        icon: null,
        kind: 'expense',
        name: 'Outros',
        organizationId: 'org_a',
        parentId: null,
      },
      repository,
    )

    const result = await createCategory(
      {
        color: null,
        icon: null,
        kind: 'income',
        name: 'Outros',
        organizationId: 'org_a',
        parentId: null,
      },
      repository,
    )

    expect(result.ok).toBe(true)
  })
})
