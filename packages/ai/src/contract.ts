import { describe, expect, test } from 'bun:test'

import type { AgentBackend } from './backend'
import type { AgentMessage } from './message'

export type BackendContractOptions = {
  /** A real model id valid for this provider, used only by the live-call test. */
  model: string
  /**
   * Absent for the stub and for a real adapter with no configured key
   * (Fase 07 § "Dois provedores desde o início" - optional individually).
   * A missing key skips the one assertion that needs a network call; every
   * guardrail assertion below still runs against the adapter unconfigured.
   */
  skipLiveRun?: boolean
}

/**
 * The one suite every `AgentBackend` passes (Fase 07 § Critério de
 * conclusão) - stub, Anthropic and OpenRouter alike. A provider-specific
 * test file calls this once with its own `createBackend` and options.
 */
export const runBackendContract = (
  name: string,
  createBackend: () => AgentBackend,
  { model, skipLiveRun }: BackendContractOptions,
) => {
  describe(`${name} backend contract`, () => {
    test('refuses a run with no organizationId before any provider call', async () => {
      const backend = createBackend()
      const collected: AgentMessage[] = []

      for await (const message of backend.run(
        { messages: [{ content: 'hi', role: 'user' }] },
        { model, organizationId: '' },
      )) {
        collected.push(message)
      }

      expect(collected).toEqual([
        {
          code: 'missing_organization_context',
          kind: 'error',
          message: 'An AI run requires an organizationId.',
        },
      ])
    })

    test.skipIf(Boolean(skipLiveRun))(
      'runs a minimal prompt and yields text plus a completed status',
      async () => {
        const backend = createBackend()
        const collected: AgentMessage[] = []

        for await (const message of backend.run(
          { messages: [{ content: 'Reply with exactly one word: pong', role: 'user' }] },
          { maxOutputTokens: 16, model, organizationId: 'ai_contract_test_org' },
        )) {
          collected.push(message)
        }

        expect(collected.some((message) => message.kind === 'text')).toBe(true)
        expect(
          collected.some((message) => message.kind === 'status' && message.status === 'completed'),
        ).toBe(true)
      },
    )
  })
}
