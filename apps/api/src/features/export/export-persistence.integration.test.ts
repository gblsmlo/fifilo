import { afterAll, beforeAll, describe, expect, test } from 'bun:test'
import type { EntityId } from '@fifilo/core/primitives'
import { generateEntityId } from '@fifilo/core/primitives'
import { db } from '@fifilo/infra-database/client'
import {
  categories,
  entries,
  financialAccounts,
  organizations,
  transactions,
  users,
} from '@fifilo/infra-database/schema'
import { withWorkspaceTransactionOn } from '@fifilo/infra-database/workspace'
import { inArray } from 'drizzle-orm'

import { requirePostgres } from '../../test/require-postgres'
import { createExportReader } from './export-persistence'

/**
 * Fase 06 § Riscos names this by name: "Exportação vazando dado de outro
 * workspace... teste com duas organizações populadas" - both organizations
 * get transactions in the same period, and B's reader must return exactly
 * its own rows.
 */
const ORGANIZATION_A = `test_export_org_a_${generateEntityId()}`
const ORGANIZATION_B = `test_export_org_b_${generateEntityId()}`
const USER_ID = `test_export_user_${generateEntityId()}`

const reader = createExportReader()

beforeAll(async () => {
  await requirePostgres()

  await db.insert(organizations).values([
    { id: ORGANIZATION_A, name: 'Test Export Org A', slug: `${ORGANIZATION_A}-slug` },
    { id: ORGANIZATION_B, name: 'Test Export Org B', slug: `${ORGANIZATION_B}-slug` },
  ])
  await db.insert(users).values({
    email: `${USER_ID}@fifilo.local`,
    emailVerified: true,
    id: USER_ID,
    name: 'Test Export User',
  })

  for (const organizationId of [ORGANIZATION_A, ORGANIZATION_B]) {
    const accountId = generateEntityId() as EntityId
    const categoryId = generateEntityId() as EntityId
    const transactionId = generateEntityId() as EntityId

    await withWorkspaceTransactionOn(db, organizationId, async (tx) => {
      await tx.insert(financialAccounts).values({
        createdBy: USER_ID,
        currency: 'BRL',
        id: accountId,
        kind: 'checking',
        name: `Checking ${organizationId}`,
        organizationId,
      })
      await tx.insert(categories).values({
        id: categoryId,
        kind: 'expense',
        name: `Category ${organizationId}`,
        organizationId,
      })
      await tx.insert(transactions).values({
        categoryId,
        createdBy: USER_ID,
        description: `Expense of ${organizationId}`,
        id: transactionId,
        kind: 'expense',
        occurredOn: '2026-01-10',
        organizationId,
      })
      await tx.insert(entries).values({
        accountId,
        amountMinor: -5_000,
        currency: 'BRL',
        id: generateEntityId(),
        occurredOn: '2026-01-10',
        organizationId,
        transactionId,
      })
    })
  }
})

afterAll(async () => {
  await db.delete(organizations).where(inArray(organizations.id, [ORGANIZATION_A, ORGANIZATION_B]))
  await db.delete(users).where(inArray(users.id, [USER_ID]))
})

describe('export persistence', () => {
  test('returns only the requesting organization`s rows for the period', async () => {
    const rowsA = await reader.transactionRows(ORGANIZATION_A, '2026-01-01', '2026-01-31')
    const rowsB = await reader.transactionRows(ORGANIZATION_B, '2026-01-01', '2026-01-31')

    expect(rowsA).toHaveLength(1)
    expect(rowsA[0]?.description).toBe(`Expense of ${ORGANIZATION_A}`)

    expect(rowsB).toHaveLength(1)
    expect(rowsB[0]?.description).toBe(`Expense of ${ORGANIZATION_B}`)

    expect(rowsA[0]?.description).not.toBe(rowsB[0]?.description)
  })

  test('a period outside the transaction`s date returns no rows', async () => {
    const rows = await reader.transactionRows(ORGANIZATION_A, '2026-02-01', '2026-02-28')
    expect(rows).toHaveLength(0)
  })

  test('carries the account and category names, not just their ids', async () => {
    const [row] = await reader.transactionRows(ORGANIZATION_A, '2026-01-01', '2026-01-31')
    expect(row?.accountName).toBe(`Checking ${ORGANIZATION_A}`)
    expect(row?.categoryName).toBe(`Category ${ORGANIZATION_A}`)
  })
})
