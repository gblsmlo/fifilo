import { afterAll, beforeAll, describe, expect, test } from 'bun:test'
import { generateEntityId } from '@fifilo/core/primitives'
import { db } from '@fifilo/infra-database/client'
import { organizations, transactions, users } from '@fifilo/infra-database/schema'
import { withWorkspaceTransactionOn } from '@fifilo/infra-database/workspace'
import { and, eq, inArray, sql } from 'drizzle-orm'

import { requirePostgres } from '../../test/require-postgres'
import { createCategoriesRepository } from './categories-persistence'

/**
 * Proves the real adapter against real PostgreSQL, the same five negative
 * proofs `tenant-workspace-policy.integration.test.ts` established for the
 * fixture table (Fase 00), plus the reassign-and-archive path's own
 * atomicity (Fase 02 § Riscos: a rollback partway through must not leave the
 * category half-migrated).
 */
const ORGANIZATION_A = `test_categories_org_a_${generateEntityId()}`
const ORGANIZATION_B = `test_categories_org_b_${generateEntityId()}`
const USER_ID = `test_categories_user_${generateEntityId()}`

const repository = createCategoriesRepository()

beforeAll(async () => {
  await requirePostgres()

  await db.insert(organizations).values([
    { id: ORGANIZATION_A, name: 'Test Categories Org A', slug: `${ORGANIZATION_A}-slug` },
    { id: ORGANIZATION_B, name: 'Test Categories Org B', slug: `${ORGANIZATION_B}-slug` },
  ])
  await db.insert(users).values({
    email: `${USER_ID}@fifilo.local`,
    emailVerified: true,
    id: USER_ID,
    name: 'Test Categories User',
  })
})

afterAll(async () => {
  // Cascades to every categories/transactions row these tests created; the
  // user is deleted after, since `transactions.created_by` references it.
  await db.delete(organizations).where(inArray(organizations.id, [ORGANIZATION_A, ORGANIZATION_B]))
  await db.delete(users).where(eq(users.id, USER_ID))
})

describe('categories persistence', () => {
  test('creates a category and reads it back within its own organization', async () => {
    const id = generateEntityId()
    const created = await repository.create({
      color: null,
      createdAt: new Date(),
      icon: null,
      id,
      kind: 'expense',
      name: 'Mercado',
      organizationId: ORGANIZATION_A,
      parentId: null,
    })

    expect(created?.name).toBe('Mercado')

    const found = await repository.findById(ORGANIZATION_A, id)
    expect(found?.id).toBe(id)
  })

  test('another organization cannot list, find by name or find by id the first organization`s category', async () => {
    const id = generateEntityId()
    await repository.create({
      color: null,
      createdAt: new Date(),
      icon: null,
      id,
      kind: 'expense',
      name: 'Cross-tenant category',
      organizationId: ORGANIZATION_A,
      parentId: null,
    })

    const listedByB = await repository.list(ORGANIZATION_B, { includeArchived: true })
    expect(listedByB.some((category) => category.id === id)).toBe(false)

    const foundByNameByB = await repository.findByName(
      ORGANIZATION_B,
      null,
      'expense',
      'cross-tenant category',
    )
    expect(foundByNameByB).toBeNull()

    const foundByIdByB = await repository.findById(ORGANIZATION_B, id)
    expect(foundByIdByB).toBeNull()
  })

  test('row-level security rejects a write claiming another organization`s id (WITH CHECK)', async () => {
    const attempt = withWorkspaceTransactionOn(db, ORGANIZATION_B, (tx) =>
      tx.execute(
        sql`insert into categories
              (organization_id, id, kind, name)
            values
              (${ORGANIZATION_A}, ${generateEntityId()}, 'expense', 'Planted')`,
      ),
    )

    await expect(attempt).rejects.toThrow()
  })

  test('without a workspace context, categories are invisible', async () => {
    const id = generateEntityId()
    await repository.create({
      color: null,
      createdAt: new Date(),
      icon: null,
      id,
      kind: 'expense',
      name: 'No context check',
      organizationId: ORGANIZATION_A,
      parentId: null,
    })

    const rows = await db.execute(sql`select id from categories where id = ${id}`)
    expect([...rows]).toHaveLength(0)
  })

  test('an error mid-transaction rolls back a planted category', async () => {
    const id = generateEntityId()

    const failure = withWorkspaceTransactionOn(db, ORGANIZATION_A, async (tx) => {
      await tx.execute(
        sql`insert into categories
              (organization_id, id, kind, name)
            values
              (${ORGANIZATION_A}, ${id}, 'expense', 'Rollback check')`,
      )
      throw new Error('forced rollback')
    })

    await expect(failure).rejects.toThrow('forced rollback')

    const rows = await withWorkspaceTransactionOn(db, ORGANIZATION_A, (tx) =>
      tx.execute(sql`select id from categories where id = ${id}`),
    )
    expect([...rows]).toHaveLength(0)
  })

  test('a stale version is a conflict, not a silent overwrite (optimistic concurrency)', async () => {
    const id = generateEntityId()
    await repository.create({
      color: null,
      createdAt: new Date(),
      icon: null,
      id,
      kind: 'expense',
      name: 'Concurrency check',
      organizationId: ORGANIZATION_A,
      parentId: null,
    })

    const first = await repository.update(ORGANIZATION_A, id, 1, { color: '#111111' })
    expect(first).not.toBe('not_found')
    expect(first).not.toBe('version_conflict')

    const second = await repository.update(ORGANIZATION_A, id, 1, { color: '#222222' })
    expect(second).toBe('version_conflict')
  })

  test('reassignAndArchive moves every transaction onto the target and archives the source atomically', async () => {
    const source = generateEntityId()
    const target = generateEntityId()
    await repository.create({
      color: null,
      createdAt: new Date(),
      icon: null,
      id: source,
      kind: 'expense',
      name: 'Origem',
      organizationId: ORGANIZATION_A,
      parentId: null,
    })
    await repository.create({
      color: null,
      createdAt: new Date(),
      icon: null,
      id: target,
      kind: 'expense',
      name: 'Destino',
      organizationId: ORGANIZATION_A,
      parentId: null,
    })

    const transactionIds = [generateEntityId(), generateEntityId(), generateEntityId()]
    await withWorkspaceTransactionOn(db, ORGANIZATION_A, (tx) =>
      tx.insert(transactions).values(
        transactionIds.map((id) => ({
          categoryId: source,
          createdBy: USER_ID,
          description: 'Movida',
          id,
          kind: 'expense' as const,
          occurredOn: '2026-01-15',
          organizationId: ORGANIZATION_A,
        })),
      ),
    )

    const countBefore = await repository.countTransactions(ORGANIZATION_A, source)
    expect(countBefore).toBe(3)

    const archived = await repository.reassignAndArchive(ORGANIZATION_A, source, target)
    expect(archived?.archivedAt).not.toBeNull()

    const remaining = await repository.countTransactions(ORGANIZATION_A, source)
    expect(remaining).toBe(0)

    const moved = await repository.countTransactions(ORGANIZATION_A, target)
    expect(moved).toBe(3)
  })

  test('a failure between moving transactions and archiving leaves neither half-applied', async () => {
    const source = generateEntityId()
    const target = generateEntityId()
    await repository.create({
      color: null,
      createdAt: new Date(),
      icon: null,
      id: source,
      kind: 'expense',
      name: 'Origem instável',
      organizationId: ORGANIZATION_A,
      parentId: null,
    })
    await repository.create({
      color: null,
      createdAt: new Date(),
      icon: null,
      id: target,
      kind: 'expense',
      name: 'Destino instável',
      organizationId: ORGANIZATION_A,
      parentId: null,
    })

    const transactionId = generateEntityId()
    await withWorkspaceTransactionOn(db, ORGANIZATION_A, (tx) =>
      tx.insert(transactions).values({
        categoryId: source,
        createdBy: USER_ID,
        description: 'Não deveria se mover',
        id: transactionId,
        kind: 'expense' as const,
        occurredOn: '2026-01-15',
        organizationId: ORGANIZATION_A,
      }),
    )

    // Mirrors reassignAndArchiveCategoryRow's own two statements, but forces
    // an error between them - one instruction, one transaction (Fase 02 §
    // Riscos): the move and the archive must rise or fall together.
    const failure = withWorkspaceTransactionOn(db, ORGANIZATION_A, async (tx) => {
      await tx
        .update(transactions)
        .set({ categoryId: target })
        .where(
          and(eq(transactions.organizationId, ORGANIZATION_A), eq(transactions.categoryId, source)),
        )
      throw new Error('forced rollback between move and archive')
    })

    await expect(failure).rejects.toThrow('forced rollback between move and archive')

    const category = await repository.findById(ORGANIZATION_A, source)
    expect(category?.archivedAt).toBeNull()

    const stillOnSource = await repository.countTransactions(ORGANIZATION_A, source)
    expect(stillOnSource).toBe(1)

    const movedByAccident = await repository.countTransactions(ORGANIZATION_A, target)
    expect(movedByAccident).toBe(0)
  })
})
