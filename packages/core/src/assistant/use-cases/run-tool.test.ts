import { describe, expect, test } from 'bun:test'
import { generateEntityId } from '../../primitives'
import { createFakeAssistantToolkit } from '../tools/fake-toolkit'
import type { ToolExecutionContext } from '../tools/types'
import { runTool } from './run-tool'

const context: ToolExecutionContext = {
  organizationId: 'org_1',
  role: 'viewer',
  today: '2026-09-15',
  userId: generateEntityId(),
}

describe('runTool', () => {
  test('dispatches to the named tool', async () => {
    const toolkit = createFakeAssistantToolkit({
      analytics: { consolidatedBalance: { availableCashMinor: 1_000, committedInvoiceMinor: 0 } },
    })

    const result = await runTool(
      { name: 'account_balances', rawInput: { asOf: '2026-09-15' } },
      context,
      toolkit,
    )

    expect(result).toEqual({
      ok: true,
      value: { availableCashMinor: 1_000, committedInvoiceMinor: 0, netMinor: 1_000 },
    })
  })

  test('answers not_found for an unknown tool name - a model cannot invent one', async () => {
    const result = await runTool(
      { name: 'delete_everything', rawInput: {} },
      context,
      createFakeAssistantToolkit(),
    )

    expect(result.ok).toBe(false)
    if (!result.ok) expect((result.error as { code: string }).code).toBe('tool_not_found')
  })

  test('answers tool_input_invalid for malformed arguments, before the tool ever runs', async () => {
    const result = await runTool(
      { name: 'account_balances', rawInput: { asOf: 'not-a-date' } },
      context,
      createFakeAssistantToolkit(),
    )

    expect(result.ok).toBe(false)
    if (!result.ok) expect((result.error as { code: string }).code).toBe('tool_input_invalid')
  })
})
