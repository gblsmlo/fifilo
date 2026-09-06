import { describe, expect, test } from 'bun:test'

import { generateEntityId } from '../../primitives'
import type { Category } from '../category'
import { createFakeCategoryRepository } from './fake-category-repository'
import { updateCategory } from './update-category'

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

describe('updateCategory', () => {
  test('applies the patch and bumps the version', async () => {
    const category = seedCategory()
    const repository = createFakeCategoryRepository([category])

    const result = await updateCategory(
      { expectedVersion: 1, id: category.id, organizationId: 'org_a', patch: { color: '#f00' } },
      repository,
    )

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.value.color).toBe('#f00')
    expect(result.value.version).toBe(2)
  })

  test('a stale version is a conflict', async () => {
    const category = seedCategory({ version: 3 })
    const repository = createFakeCategoryRepository([category])

    const result = await updateCategory(
      { expectedVersion: 1, id: category.id, organizationId: 'org_a', patch: { color: '#f00' } },
      repository,
    )

    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error.code).toBe('version_conflict')
  })

  test('renaming to a name already used in the same scope is a conflict', async () => {
    const first = seedCategory({ name: 'Transporte' })
    const second = seedCategory({ id: generateEntityId(), name: 'Lazer' })
    const repository = createFakeCategoryRepository([first, second])

    const result = await updateCategory(
      { expectedVersion: 1, id: second.id, organizationId: 'org_a', patch: { name: 'transporte' } },
      repository,
    )

    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error.code).toBe('category_name_taken')
  })
})
