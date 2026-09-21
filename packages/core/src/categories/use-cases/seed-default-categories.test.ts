import { describe, expect, test } from 'bun:test'

import { generateEntityId } from '../../primitives'
import { DEFAULT_CATEGORIES, buildDefaultCategories } from '../default-set'
import { createFakeCategoryRepository } from './fake-category-repository'
import { seedDefaultCategories } from './seed-default-categories'

const command = { organizationId: 'org_1', role: 'owner' } as const

describe('buildDefaultCategories', () => {
  test('carries every declared category, flat and without colour', () => {
    const records = buildDefaultCategories('org_1')

    expect(records).toHaveLength(DEFAULT_CATEGORIES.length)
    expect(records.every((record) => record.parentId === null)).toBe(true)
    expect(records.every((record) => record.color === null)).toBe(true)
    expect(records.every((record) => record.organizationId === 'org_1')).toBe(true)
  })

  test('gives every record its own id', () => {
    const ids = new Set(buildDefaultCategories('org_1').map((record) => record.id))

    expect(ids.size).toBe(DEFAULT_CATEGORIES.length)
  })

  test('keeps the kind each category was declared with', () => {
    const records = buildDefaultCategories('org_1')

    for (const [index, declared] of DEFAULT_CATEGORIES.entries()) {
      expect(records[index]?.kind).toBe(declared.kind)
      expect(records[index]?.name).toBe(declared.name)
    }
  })

  test('the same name in both kinds is two categories, not a collision', () => {
    const others = DEFAULT_CATEGORIES.filter((category) => category.name === 'Outros')

    expect(others.map((category) => category.kind).sort()).toEqual(['expense', 'income'])
  })
})

describe('seedDefaultCategories', () => {
  test('seeds the whole set into an empty workspace', async () => {
    const repository = createFakeCategoryRepository()

    const result = await seedDefaultCategories(command, repository)

    expect(result).toEqual({ ok: true, value: DEFAULT_CATEGORIES.length })
    expect(await repository.list('org_1', { includeArchived: false })).toHaveLength(
      DEFAULT_CATEGORIES.length,
    )
  })

  test('writes nothing the second time', async () => {
    const repository = createFakeCategoryRepository()

    await seedDefaultCategories(command, repository)
    const second = await seedDefaultCategories(command, repository)

    expect(second).toEqual({ ok: true, value: 0 })
    expect(await repository.list('org_1', { includeArchived: true })).toHaveLength(
      DEFAULT_CATEGORIES.length,
    )
  })

  test('a workspace whose only category is archived is still already set up', async () => {
    const repository = createFakeCategoryRepository([
      {
        archivedAt: new Date('2026-01-02T00:00:00.000Z'),
        color: null,
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
        icon: null,
        id: generateEntityId(),
        kind: 'expense',
        name: 'Mercado',
        organizationId: 'org_1',
        parentId: null,
        updatedAt: new Date('2026-01-02T00:00:00.000Z'),
        version: 2,
      },
    ])

    const result = await seedDefaultCategories(command, repository)

    expect(result).toEqual({ ok: true, value: 0 })
  })

  test('refuses a role that is not the workspace owner', async () => {
    const repository = createFakeCategoryRepository()

    const result = await seedDefaultCategories({ ...command, role: 'admin' }, repository)

    expect(result.ok).toBe(false)
    expect(result.ok ? null : result.error.code).toBe('insufficient_role')
    expect(await repository.list('org_1', { includeArchived: true })).toHaveLength(0)
  })

  test('leaves another workspace alone', async () => {
    const repository = createFakeCategoryRepository()

    await seedDefaultCategories(command, repository)

    expect(await repository.list('org_2', { includeArchived: true })).toHaveLength(0)
  })
})
