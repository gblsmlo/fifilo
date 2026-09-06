import { afterAll, beforeAll, expect, test } from 'bun:test'
import { generateEntityId } from '@fifilo/core/primitives'
import { db } from '@fifilo/infra-database/client'
import {
  entries,
  financialAccounts,
  organizations,
  transactions,
  users,
} from '@fifilo/infra-database/schema'
import { withWorkspaceTransactionOn } from '@fifilo/infra-database/workspace'
import { eq, inArray } from 'drizzle-orm'

import { requirePostgres } from '../../test/require-postgres'
import { createFinancialEntryReader } from '../accounts/entry-reader-persistence'
import { createInvoicesRepository } from './invoices-persistence'

/**
 * The classic mistake Fase 03 § Riscos names explicitly: a card purchase
 * must not move cash. It proves it the same way `getBalances` reads a
 * balance in production - per account, from `entries` - rather than
 * asserting anything about the entry itself.
 */
const ORGANIZATION_A = `test_card_cash_org_a_${generateEntityId()}`
const USER_ID = `test_card_cash_user_${generateEntityId()}`

const entryReader = createFinancialEntryReader()
const invoices = createInvoicesRepository()

beforeAll(async () => {
  await requirePostgres()

  await db.insert(organizations).values({
    id: ORGANIZATION_A,
    name: 'Test Card Cash Org A',
    slug: `${ORGANIZATION_A}-slug`,
  })
  await db.insert(users).values({
    email: `${USER_ID}@fifilo.local`,
    emailVerified: true,
    id: USER_ID,
    name: 'Test Card Cash User',
  })
})

afterAll(async () => {
  await db.delete(organizations).where(inArray(organizations.id, [ORGANIZATION_A]))
  await db.delete(users).where(eq(users.id, USER_ID))
})

test('registering an expense on the credit card account never changes the checking account`s balance', async () => {
  const checkingId = generateEntityId()
  const cardAccountId = generateEntityId()

  await withWorkspaceTransactionOn(db, ORGANIZATION_A, (tx) =>
    tx.insert(financialAccounts).values([
      {
        createdBy: USER_ID,
        currency: 'BRL',
        id: checkingId,
        kind: 'checking',
        name: 'Checking',
        organizationId: ORGANIZATION_A,
      },
      {
        createdBy: USER_ID,
        currency: 'BRL',
        id: cardAccountId,
        kind: 'credit_card',
        name: 'Card',
        organizationId: ORGANIZATION_A,
      },
    ]),
  )

  // An opening entry on checking, established before any card activity, is
  // the baseline the test proves stays untouched.
  await withWorkspaceTransactionOn(db, ORGANIZATION_A, (tx) =>
    tx.insert(entries).values({
      accountId: checkingId,
      amountMinor: 100_000,
      currency: 'BRL',
      id: generateEntityId(),
      occurredOn: '2026-06-01',
      organizationId: ORGANIZATION_A,
    }),
  )

  const invoice = await invoices.findOrCreateOpen({
    accountId: cardAccountId,
    dueOn: '2026-06-20',
    id: generateEntityId(),
    organizationId: ORGANIZATION_A,
    periodEnd: '2026-06-10',
    periodStart: '2026-05-11',
  })

  const transactionId = generateEntityId()
  await withWorkspaceTransactionOn(db, ORGANIZATION_A, async (tx) => {
    await tx.insert(transactions).values({
      createdBy: USER_ID,
      description: 'Compra no cartão',
      id: transactionId,
      kind: 'expense',
      occurredOn: '2026-06-05',
      organizationId: ORGANIZATION_A,
    })
    await tx.insert(entries).values({
      accountId: cardAccountId,
      amountMinor: -5_000,
      currency: 'BRL',
      id: generateEntityId(),
      invoiceId: invoice.id,
      occurredOn: '2026-06-05',
      organizationId: ORGANIZATION_A,
      transactionId,
    })
  })

  const balances = await entryReader.balancesByAccount(ORGANIZATION_A, '2026-06-30')

  expect(balances.get(checkingId)).toBe(100_000)
  expect(balances.get(cardAccountId)).toBe(-5_000)
})
