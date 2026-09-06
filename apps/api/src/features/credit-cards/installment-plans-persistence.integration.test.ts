import { afterAll, beforeAll, describe, expect, test } from 'bun:test'
import type { EntityId } from '@fifilo/core/primitives'
import { generateEntityId } from '@fifilo/core/primitives'
import { db } from '@fifilo/infra-database/client'
import {
  financialAccounts,
  installmentPlans,
  organizations,
  transactions,
  users,
} from '@fifilo/infra-database/schema'
import { withWorkspaceTransactionOn } from '@fifilo/infra-database/workspace'
import { and, eq, inArray, sql } from 'drizzle-orm'

import { requirePostgres } from '../../test/require-postgres'
import { createInstallmentPlansRepository } from './installment-plans-persistence'
import { createInvoicesRepository } from './invoices-persistence'

/**
 * The five negative RLS proofs against real PostgreSQL, through the adapter
 * the API actually calls (Fase 03 § Persistência: `installment_plans`), plus
 * the atomic-write proof `createWithTransactions` exists for: a failure
 * partway through must not leave a plan with a gap in its installments
 * (Fase 03 § Modelagem, the same rollback discipline Fase 02's
 * `reassignAndArchive` already proved for categories).
 */
const ORGANIZATION_A = `test_installments_org_a_${generateEntityId()}`
const ORGANIZATION_B = `test_installments_org_b_${generateEntityId()}`
const USER_ID = `test_installments_user_${generateEntityId()}`

const repository = createInstallmentPlansRepository()
const invoices = createInvoicesRepository()

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

const seedOpenInvoice = async (organizationId: string, accountId: EntityId): Promise<EntityId> => {
  const invoice = await invoices.findOrCreateOpen({
    accountId,
    dueOn: '2026-06-20',
    id: generateEntityId(),
    organizationId,
    periodEnd: '2026-06-10',
    periodStart: '2026-05-11',
  })
  return invoice.id
}

beforeAll(async () => {
  await requirePostgres()

  await db.insert(organizations).values([
    { id: ORGANIZATION_A, name: 'Test Installments Org A', slug: `${ORGANIZATION_A}-slug` },
    { id: ORGANIZATION_B, name: 'Test Installments Org B', slug: `${ORGANIZATION_B}-slug` },
  ])
  await db.insert(users).values({
    email: `${USER_ID}@fifilo.local`,
    emailVerified: true,
    id: USER_ID,
    name: 'Test Installments User',
  })
})

afterAll(async () => {
  await db.delete(organizations).where(inArray(organizations.id, [ORGANIZATION_A, ORGANIZATION_B]))
  await db.delete(users).where(eq(users.id, USER_ID))
})

describe('installment_plans persistence', () => {
  test('creates the plan and every installment transaction atomically', async () => {
    const accountId = await seedAccount(ORGANIZATION_A)
    const invoiceId = await seedOpenInvoice(ORGANIZATION_A, accountId)
    const planId = generateEntityId()

    const transactionIds = await repository.createWithTransactions(
      {
        categoryId: null,
        createdAt: new Date(),
        createdBy: USER_ID as EntityId,
        description: 'Notebook',
        firstOccurredOn: '2026-06-05',
        id: planId,
        installments: 2,
        notes: null,
        organizationId: ORGANIZATION_A,
        totalMinor: 10_000,
      },
      [
        {
          accountId,
          amountMinor: -5_000,
          currency: 'BRL',
          installmentNumber: 1,
          invoiceId,
          occurredOn: '2026-06-05',
        },
        {
          accountId,
          amountMinor: -5_000,
          currency: 'BRL',
          installmentNumber: 2,
          invoiceId,
          occurredOn: '2026-07-05',
        },
      ],
    )

    expect(transactionIds).toHaveLength(2)

    const rows = await withWorkspaceTransactionOn(db, ORGANIZATION_A, (tx) =>
      tx
        .select()
        .from(transactions)
        .where(
          and(
            eq(transactions.organizationId, ORGANIZATION_A),
            eq(transactions.installmentPlanId, planId),
          ),
        ),
    )
    expect(rows).toHaveLength(2)
    expect(rows.map((row) => row.installmentNumber).sort()).toEqual([1, 2])
  })

  test('another organization cannot see the first organization`s plan or its transactions', async () => {
    const accountId = await seedAccount(ORGANIZATION_A)
    const invoiceId = await seedOpenInvoice(ORGANIZATION_A, accountId)
    const planId = generateEntityId()

    await repository.createWithTransactions(
      {
        categoryId: null,
        createdAt: new Date(),
        createdBy: USER_ID as EntityId,
        description: 'Notebook',
        firstOccurredOn: '2026-06-05',
        id: planId,
        installments: 1,
        notes: null,
        organizationId: ORGANIZATION_A,
        totalMinor: 5_000,
      },
      [
        {
          accountId,
          amountMinor: -5_000,
          currency: 'BRL',
          installmentNumber: 1,
          invoiceId,
          occurredOn: '2026-06-05',
        },
      ],
    )

    const rowsByB = await withWorkspaceTransactionOn(db, ORGANIZATION_B, (tx) =>
      tx.select().from(installmentPlans).where(eq(installmentPlans.id, planId)),
    )
    expect(rowsByB).toHaveLength(0)
  })

  test('row-level security rejects a write claiming another organization`s id (WITH CHECK)', async () => {
    const attempt = withWorkspaceTransactionOn(db, ORGANIZATION_B, (tx) =>
      tx.execute(
        sql`insert into installment_plans
              (organization_id, id, description, total_minor, installments, first_occurred_on, created_by)
            values
              (${ORGANIZATION_A}, ${generateEntityId()}, 'Planted', 1000, 1, '2026-06-05', ${USER_ID})`,
      ),
    )

    await expect(attempt).rejects.toThrow()
  })

  test('without a workspace context, plans are invisible', async () => {
    const id = generateEntityId()
    await withWorkspaceTransactionOn(db, ORGANIZATION_A, (tx) =>
      tx.execute(
        sql`insert into installment_plans
              (organization_id, id, description, total_minor, installments, first_occurred_on, created_by)
            values
              (${ORGANIZATION_A}, ${id}, 'No context check', 1000, 1, '2026-06-05', ${USER_ID})`,
      ),
    )

    const rows = await db.execute(sql`select id from installment_plans where id = ${id}`)
    expect([...rows]).toHaveLength(0)
  })

  test('a failure between the plan and its transactions leaves neither half-applied', async () => {
    const planId = generateEntityId()
    const transactionId = generateEntityId()

    // Mirrors `createInstallmentPlanWithTransactions`'s own inserts, but
    // forces an error between the plan and its transaction.
    const failure = withWorkspaceTransactionOn(db, ORGANIZATION_A, async (tx) => {
      await tx.insert(installmentPlans).values({
        createdBy: USER_ID,
        description: 'Should not survive',
        firstOccurredOn: '2026-06-05',
        id: planId,
        installments: 1,
        organizationId: ORGANIZATION_A,
        totalMinor: 5_000,
      })
      await tx.insert(transactions).values({
        createdBy: USER_ID,
        description: 'Should not survive',
        id: transactionId,
        installmentNumber: 1,
        installmentPlanId: planId,
        kind: 'expense',
        occurredOn: '2026-06-05',
        organizationId: ORGANIZATION_A,
      })
      throw new Error('forced rollback between transaction and entry')
    })

    await expect(failure).rejects.toThrow('forced rollback between transaction and entry')

    const planRows = await withWorkspaceTransactionOn(db, ORGANIZATION_A, (tx) =>
      tx.select().from(installmentPlans).where(eq(installmentPlans.id, planId)),
    )
    expect(planRows).toHaveLength(0)

    const transactionRows = await withWorkspaceTransactionOn(db, ORGANIZATION_A, (tx) =>
      tx.select().from(transactions).where(eq(transactions.id, transactionId)),
    )
    expect(transactionRows).toHaveLength(0)
  })
})
