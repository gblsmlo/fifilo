import { describe, expect, test } from 'bun:test'

import type { AgentBackend } from './backend'
import { capErrorBuffer, withRequiredContext, withTimeout } from './guardrails'
import type { AgentMessage } from './message'

const collect = async (backend: AgentBackend, organizationId: string): Promise<AgentMessage[]> => {
  const collected: AgentMessage[] = []
  for await (const message of backend.run(
    { messages: [{ content: 'hi', role: 'user' }] },
    { model: 'test', organizationId },
  )) {
    collected.push(message)
  }
  return collected
}

describe('withRequiredContext', () => {
  test('refuses before the wrapped backend ever runs', async () => {
    let ran = false
    const backend: AgentBackend = {
      provider: 'fake',
      async *run() {
        ran = true
        yield { kind: 'text', text: 'should never happen' }
      },
    }

    const messages = await collect(withRequiredContext(backend), '')

    expect(ran).toBe(false)
    expect(messages).toEqual([
      {
        code: 'missing_organization_context',
        kind: 'error',
        message: 'An AI run requires an organizationId.',
      },
    ])
  })

  test('passes a real organizationId through untouched', async () => {
    const backend: AgentBackend = {
      provider: 'fake',
      async *run() {
        yield { kind: 'text', text: 'ok' }
      },
    }

    expect(await collect(withRequiredContext(backend), 'org_a')).toEqual([
      { kind: 'text', text: 'ok' },
    ])
  })
})

describe('withTimeout', () => {
  test('yields a timeout error when the backend never finishes in time', async () => {
    const backend: AgentBackend = {
      provider: 'fake',
      async *run(_input, options) {
        await new Promise((_resolve, reject) => {
          options.signal?.addEventListener('abort', () => reject(new Error('aborted')))
        })
      },
    }

    const collected: AgentMessage[] = []
    for await (const message of withTimeout(backend).run(
      { messages: [{ content: 'hi', role: 'user' }] },
      { model: 'test', organizationId: 'org_a', timeoutMs: 10 },
    )) {
      collected.push(message)
    }

    expect(collected).toEqual([{ code: 'timeout', kind: 'error', message: 'Run exceeded 10ms.' }])
  })

  test('passes through untouched when no timeoutMs is given', async () => {
    const backend: AgentBackend = {
      provider: 'fake',
      async *run() {
        yield { kind: 'text', text: 'fast enough' }
      },
    }

    expect(await collect(withTimeout(backend), 'org_a')).toEqual([
      { kind: 'text', text: 'fast enough' },
    ])
  })
})

describe('capErrorBuffer', () => {
  test('leaves a short message untouched', () => {
    expect(capErrorBuffer('boom')).toBe('boom')
  })

  test('truncates to the byte cap and marks the cut', () => {
    const huge = 'x'.repeat(100)
    const capped = capErrorBuffer(huge, 10)

    expect(capped).toBe(`${'x'.repeat(10)}… [truncated]`)
  })
})
