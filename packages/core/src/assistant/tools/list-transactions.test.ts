import { describe, expect, test } from 'bun:test'
import { generateEntityId } from '../../primitives'
import type { Transaction } from '../../transactions/transaction'
import { createFakeAssistantToolkit } from './fake-toolkit'
import { listTransactionsTool } from './list-transactions'
import type { ToolExecutionContext } from './types'

const ORGANIZATION_ID = 'org_1'

const context: ToolExecutionContext = {
  organizationId: ORGANIZATION_ID,
  role: 'viewer',
  today: '2026-09-15',
  userId: generateEntityId(),
}

const seedTransaction = (overrides: Partial<Transaction> = {}): Transaction => ({
  categoryId: null,
  createdAt: new Date(),
  createdBy: generateEntityId(),
  description: 'Mercado',
  id: generateEntityId(),
  kind: 'expense',
  legs: [],
  notes: null,
  occurredOn: '2026-09-10',
  organizationId: ORGANIZATION_ID,
  updatedAt: new Date(),
  version: 1,
  ...overrides,
})

describe('listTransactionsTool', () => {
  test('a viewer can call it - every tool this fase ships is read-only', async () => {
    const toolkit = createFakeAssistantToolkit({ transactions: [seedTransaction()] })

    const result = await listTransactionsTool.execute({ limit: 10 }, context, toolkit)

    expect(result.ok).toBe(true)
    if (result.ok) expect(result.value.items).toHaveLength(1)
  })

  test('never sees another organization`s transactions', async () => {
    const mine = seedTransaction()
    const theirs = seedTransaction({ organizationId: 'org_other' })
    const toolkit = createFakeAssistantToolkit({ transactions: [mine, theirs] })

    const result = await listTransactionsTool.execute({ limit: 10 }, context, toolkit)

    expect(result.ok).toBe(true)
    if (result.ok) expect(result.value.items.map((item) => item.id)).toEqual([mine.id])
  })
})
