import type { AgentBackend, AgentInput, RunOptions } from './backend'
import { withGuardrails } from './guardrails'
import type { AgentMessage } from './message'

export type StubBackendOptions = {
  messages?: AgentMessage[]
}

/**
 * A deterministic, network-free adapter implementing the same
 * `AgentBackend` every real one does - Fase 08 onward tests against this
 * instead of a live provider, and the contract suite (`contract.ts`) proves
 * it obeys the same guardrails a real adapter must.
 */
const createRawStubBackend = ({
  messages = [
    { kind: 'text', text: 'stub response' },
    { kind: 'status', status: 'completed' },
  ],
}: StubBackendOptions = {}): AgentBackend => ({
  provider: 'stub',
  async *run(_input: AgentInput, _options: RunOptions): AsyncIterable<AgentMessage> {
    for (const message of messages) yield message
  },
})

export const createStubBackend = (options: StubBackendOptions = {}): AgentBackend =>
  withGuardrails(createRawStubBackend(options))
