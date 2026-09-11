import { describe, expect, test } from 'bun:test'
import { generateEntityId } from '../../primitives'
import { accountBalancesTool } from './account-balances'
import { createFakeAssistantToolkit } from './fake-toolkit'
import type { ToolExecutionContext } from './types'

const context: ToolExecutionContext = {
  organizationId: 'org_1',
  role: 'viewer',
  today: '2026-09-15',
  userId: generateEntityId(),
}

describe('accountBalancesTool', () => {
  test('nets available cash against committed invoices - the arithmetic the tool must never get wrong', async () => {
    const toolkit = createFakeAssistantToolkit({
      analytics: {
        consolidatedBalance: { availableCashMinor: 100_000, committedInvoiceMinor: 30_000 },
      },
    })

    const result = await accountBalancesTool.execute({ asOf: '2026-09-15' }, context, toolkit)

    expect(result).toEqual({
      ok: true,
      value: { availableCashMinor: 100_000, committedInvoiceMinor: 30_000, netMinor: 70_000 },
    })
  })
})
