import { describe, expect, test } from 'bun:test'

import { generateEntityId } from '../../primitives'
import type { Category } from '../category'
import { createFakeCategoryRepository } from './fake-category-repository'
import { reassignCategory } from './reassign-category'

const seedCategory = (overrides: Partial<Category> = {}): Category => ({
  archivedAt: null,
  color: null,
  createdAt: new Date('2026-01-01'),
  icon: null,
  id: generateEntityId(),
  kind: 'expense',
  name: 'Transporte',
  organizationId: 'org_a',
  parentId: null,
  updatedAt: new Date('2026-01-01'),
  version: 1,
  ...overrides,
})

describe('reassignCategory', () => {
  test('a category with no transactions just archives, no target needed', async () => {
    const category = seedCategory()
    const repository = createFakeCategoryRepository([category])

    const result = await reassignCategory(
      { id: category.id, organizationId: 'org_a', targetCategoryId: null },
      repository,
    )

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.value.archivedAt).not.toBeNull()
  })

  test('a category with transactions requires a target', async () => {
    const category = seedCategory()
    const repository = createFakeCategoryRepository([category], { [category.id]: 3 })

    const result = await reassignCategory(
      { id: category.id, organizationId: 'org_a', targetCategoryId: null },
      repository,
    )

    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error.code).toBe('target_category_required')
  })

  test('the target must have the same kind', async () => {
    const category = seedCategory({ kind: 'expense' })
    const target = seedCategory({ id: generateEntityId(), kind: 'income', name: 'Salário' })
    const repository = createFakeCategoryRepository([category, target], { [category.id]: 2 })

    const result = await reassignCategory(
      { id: category.id, organizationId: 'org_a', targetCategoryId: target.id },
      repository,
    )

    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error.code).toBe('invalid_target_category')
  })

  test('moves transactions to the target and archives the source', async () => {
    const category = seedCategory({ kind: 'expense' })
    const target = seedCategory({ id: generateEntityId(), kind: 'expense', name: 'Outros' })
    const repository = createFakeCategoryRepository([category, target], { [category.id]: 5 })

    const result = await reassignCategory(
      { id: category.id, organizationId: 'org_a', targetCategoryId: target.id },
      repository,
    )

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.value.archivedAt).not.toBeNull()

    const remainingCount = await repository.countTransactions('org_a', category.id)
    expect(remainingCount).toBe(0)
  })

  test('an unknown category is not found', async () => {
    const repository = createFakeCategoryRepository()

    const result = await reassignCategory(
      { id: generateEntityId(), organizationId: 'org_a', targetCategoryId: null },
      repository,
    )

    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error.code).toBe('category_not_found')
  })
})
