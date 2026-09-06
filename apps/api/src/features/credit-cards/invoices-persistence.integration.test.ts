import { afterAll, beforeAll, describe, expect, test } from 'bun:test'
import type { EntityId } from '@fifilo/core/primitives'
import { generateEntityId } from '@fifilo/core/primitives'
import { db } from '@fifilo/infra-database/client'
import { entries, financialAccounts, organizations, users } from '@fifilo/infra-database/schema'
import { withWorkspaceTransactionOn } from '@fifilo/infra-database/workspace'
import { eq, inArray, sql } from 'drizzle-orm'

import { requirePostgres } from '../../test/require-postgres'
import { createInvoicesRepository } from './invoices-persistence'

/**
 * The five negative RLS proofs against real PostgreSQL, through the adapter
 * the API actually calls (Fase 03 § Persistência: `card_invoices`), plus the
 * behavior that has no meaningful fake: the unique-index-backed
 * get-or-create and the entry-sum a close/available-limit read depends on.
 */
const ORGANIZATION_A = `test_invoices_org_a_${generateEntityId()}`
const ORGANIZATION_B = `test_invoices_org_b_${generateEntityId()}`
const USER_ID = `test_invoices_user_${generateEntityId()}`

const repository = createInvoicesRepository()

const seedAccount = async (organizationId: string): Promise<EntityId> => {
  const id = generateEntityId()
  await withWorkspaceTransactionOn(db, organizationId, (tx) =>
    tx.insert(financialAccounts).values({
      createdBy: USER_ID,
      currency: 'BRL',
      id,
      kind: 'credit_card',
      name: `Card ${id}`,
      organizationId,
    }),
  )
  return id
}

const seedEntry = async (
  organizationId: string,
  accountId: EntityId,
  invoiceId: EntityId,
  amountMinor: number,
) =>
  withWorkspaceTransactionOn(db, organizationId, (tx) =>
    tx.insert(entries).values({
      accountId,
      amountMinor,
      currency: 'BRL',
      id: generateEntityId(),
      invoiceId,
      occurredOn: '2026-06-05',
      organizationId,
    }),
  )

beforeAll(async () => {
  await requirePostgres()

  await db.insert(organizations).values([
    { id: ORGANIZATION_A, name: 'Test Invoices Org A', slug: `${ORGANIZATION_A}-slug` },
    { id: ORGANIZATION_B, name: 'Test Invoices Org B', slug: `${ORGANIZATION_B}-slug` },
  ])
  await db.insert(users).values({
    email: `${USER_ID}@fifilo.local`,
    emailVerified: true,
    id: USER_ID,
    name: 'Test Invoices User',
  })
})

afterAll(async () => {
  await db.delete(organizations).where(inArray(organizations.id, [ORGANIZATION_A, ORGANIZATION_B]))
  await db.delete(users).where(eq(users.id, USER_ID))
})

describe('card_invoices persistence', () => {
  test('creates an invoice via findOrCreateOpen and reads it back within its own organization', async () => {
    const accountId = await seedAccount(ORGANIZATION_A)

    const created = await repository.findOrCreateOpen({
      accountId,
      dueOn: '2026-06-20',
      id: generateEntityId(),
      organizationId: ORGANIZATION_A,
      periodEnd: '2026-06-10',
      periodStart: '2026-05-11',
    })

    expect(created.status).toBe('open')

    const found = await repository.findById(ORGANIZATION_A, created.id)
    expect(found?.id).toBe(created.id)
  })

  test('another organization cannot find or list the first organization`s invoice', async () => {
    const accountId = await seedAccount(ORGANIZATION_A)
    const created = await repository.findOrCreateOpen({
      accountId,
      dueOn: '2026-06-20',
      id: generateEntityId(),
      organizationId: ORGANIZATION_A,
      periodEnd: '2026-06-10',
      periodStart: '2026-05-11',
    })

    const foundByB = await repository.findById(ORGANIZATION_B, created.id)
    expect(foundByB).toBeNull()

    const listedByB = await repository.list(ORGANIZATION_B, accountId)
    expect(listedByB).toHaveLength(0)
  })

  test('row-level security rejects a write claiming another organization`s id (WITH CHECK)', async () => {
    const accountId = await seedAccount(ORGANIZATION_A)

    const attempt = withWorkspaceTransactionOn(db, ORGANIZATION_B, (tx) =>
      tx.execute(
        sql`insert into card_invoices
              (organization_id, id, account_id, period_start, period_end, due_on)
            values
              (${ORGANIZATION_A}, ${generateEntityId()}, ${accountId}, '2026-05-11', '2026-06-10', '2026-06-20')`,
      ),
    )

    await expect(attempt).rejects.toThrow()
  })

  test('without a workspace context, invoices are invisible', async () => {
    const accountId = await seedAccount(ORGANIZATION_A)
    const created = await repository.findOrCreateOpen({
      accountId,
      dueOn: '2026-06-20',
      id: generateEntityId(),
      organizationId: ORGANIZATION_A,
      periodEnd: '2026-06-10',
      periodStart: '2026-05-11',
    })

    const rows = await db.execute(sql`select id from card_invoices where id = ${created.id}`)
    expect([...rows]).toHaveLength(0)
  })

  test('an error mid-transaction rolls back a planted invoice', async () => {
    const accountId = await seedAccount(ORGANIZATION_A)
    const id = generateEntityId()

    const failure = withWorkspaceTransactionOn(db, ORGANIZATION_A, async (tx) => {
      await tx.execute(
        sql`insert into card_invoices
              (organization_id, id, account_id, period_start, period_end, due_on)
            values
              (${ORGANIZATION_A}, ${id}, ${accountId}, '2026-05-11', '2026-06-10', '2026-06-20')`,
      )
      throw new Error('forced rollback')
    })

    await expect(failure).rejects.toThrow('forced rollback')

    const found = await repository.findById(ORGANIZATION_A, id)
    expect(found).toBeNull()
  })

  test('findOrCreateOpen is stable: a second call for the same period returns the same row', async () => {
    const accountId = await seedAccount(ORGANIZATION_A)
    const record = {
      accountId,
      dueOn: '2026-06-20',
      id: generateEntityId(),
      organizationId: ORGANIZATION_A,
      periodEnd: '2026-06-10',
      periodStart: '2026-05-11',
    }

    const first = await repository.findOrCreateOpen(record)
    const second = await repository.findOrCreateOpen({ ...record, id: generateEntityId() })

    expect(second.id).toBe(first.id)
  })

  test('close sums the entries assigned to the invoice into a positive total', async () => {
    const accountId = await seedAccount(ORGANIZATION_A)
    const invoice = await repository.findOrCreateOpen({
      accountId,
      dueOn: '2026-06-20',
      id: generateEntityId(),
      organizationId: ORGANIZATION_A,
      periodEnd: '2026-06-10',
      periodStart: '2026-05-11',
    })
    await seedEntry(ORGANIZATION_A, accountId, invoice.id, -3_000)
    await seedEntry(ORGANIZATION_A, accountId, invoice.id, -2_000)

    const summed = await repository.sumEntries(ORGANIZATION_A, invoice.id)
    expect(summed).toBe(5_000)

    const closed = await repository.close(ORGANIZATION_A, invoice.id, invoice.version, summed)
    expect(closed).not.toBe('not_found')
    expect(closed).not.toBe('not_open')
    expect(closed).not.toBe('version_conflict')
    if (typeof closed === 'string') return
    expect(closed.status).toBe('closed')
    expect(closed.totalMinor).toBe(5_000)
  })

  test('close is guarded by the expected version, distinct from a closed invoice', async () => {
    const accountId = await seedAccount(ORGANIZATION_A)
    const invoice = await repository.findOrCreateOpen({
      accountId,
      dueOn: '2026-06-20',
      id: generateEntityId(),
      organizationId: ORGANIZATION_A,
      periodEnd: '2026-06-10',
      periodStart: '2026-05-11',
    })

    const staleVersion = await repository.close(ORGANIZATION_A, invoice.id, invoice.version + 1, 0)
    expect(staleVersion).toBe('version_conflict')

    const closed = await repository.close(ORGANIZATION_A, invoice.id, invoice.version, 0)
    expect(closed).not.toBe('version_conflict')

    const alreadyClosed = await repository.close(ORGANIZATION_A, invoice.id, invoice.version, 0)
    expect(alreadyClosed).toBe('not_open')
  })

  test('sumUnpaidClosedTotals sums every closed invoice on the account, not a paid one', async () => {
    const accountId = await seedAccount(ORGANIZATION_A)
    const closedInvoice = await repository.findOrCreateOpen({
      accountId,
      dueOn: '2026-06-20',
      id: generateEntityId(),
      organizationId: ORGANIZATION_A,
      periodEnd: '2026-06-10',
      periodStart: '2026-05-11',
    })
    await repository.close(ORGANIZATION_A, closedInvoice.id, closedInvoice.version, 4_000)

    const paidInvoice = await repository.findOrCreateOpen({
      accountId,
      dueOn: '2026-05-20',
      id: generateEntityId(),
      organizationId: ORGANIZATION_A,
      periodEnd: '2026-05-10',
      periodStart: '2026-04-11',
    })
    const closedThenPaid = await repository.close(
      ORGANIZATION_A,
      paidInvoice.id,
      paidInvoice.version,
      9_000,
    )
    if (typeof closedThenPaid === 'string') throw new Error('expected a closed invoice')
    await repository.markPaid(ORGANIZATION_A, paidInvoice.id, new Date())

    const total = await repository.sumUnpaidClosedTotals(ORGANIZATION_A, accountId)
    expect(total).toBe(4_000)
  })
})
