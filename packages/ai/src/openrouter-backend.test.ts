import { afterEach, describe, expect, test } from 'bun:test'

import { runBackendContract } from './contract'
import { createOpenRouterBackend, parseOpenRouterSseData } from './openrouter-backend'

const hasKey = Boolean(process.env.OPENROUTER_API_KEY)

runBackendContract(
  'openrouter',
  () => createOpenRouterBackend(process.env.OPENROUTER_API_KEY ?? ''),
  {
    model: 'anthropic/claude-3.5-haiku',
    skipLiveRun: !hasKey,
  },
)

describe('parseOpenRouterSseData', () => {
  test('parses a JSON chunk', () => {
    expect(parseOpenRouterSseData(' {"choices":[]}')).toEqual({ choices: [] })
  })

  test('recognizes the [DONE] sentinel', () => {
    expect(parseOpenRouterSseData(' [DONE]')).toBe('done')
  })

  test('ignores a blank line', () => {
    expect(parseOpenRouterSseData('   ')).toBeNull()
  })

  test('ignores malformed JSON rather than throwing', () => {
    expect(parseOpenRouterSseData(' not json')).toBeNull()
  })
})

const sseResponse = (lines: string[]): Response => {
  const body = new ReadableStream<Uint8Array>({
    start(controller) {
      const encoder = new TextEncoder()
      for (const line of lines) controller.enqueue(encoder.encode(`${line}\n`))
      controller.close()
    },
  })
  return new Response(body, { status: 200 })
}

const chunk = (delta: Record<string, unknown>, finishReason: string | null = null) =>
  `data: ${JSON.stringify({ choices: [{ delta, finish_reason: finishReason }] })}`

describe('createOpenRouterBackend (mocked transport)', () => {
  const originalFetch = globalThis.fetch

  afterEach(() => {
    globalThis.fetch = originalFetch
  })

  test('streams text deltas and ends with a completed status', async () => {
    globalThis.fetch = (async () =>
      sseResponse([
        chunk({ content: 'olá' }),
        chunk({ content: ' mundo' }),
        `${chunk({}, 'stop')}`,
        'data: [DONE]',
        '',
      ])) as unknown as typeof fetch

    const backend = createOpenRouterBackend('or-fake-key')
    const collected = []
    for await (const message of backend.run(
      { messages: [{ content: 'oi', role: 'user' }] },
      { model: 'anthropic/claude-3.5-haiku', organizationId: 'org_a' },
    )) {
      collected.push(message)
    }

    expect(collected).toEqual([
      { kind: 'text', text: 'olá' },
      { kind: 'text', text: ' mundo' },
      { kind: 'status', status: 'completed' },
    ])
  })

  test('accumulates a tool call split across deltas and emits it before the status', async () => {
    globalThis.fetch = (async () =>
      sseResponse([
        chunk({
          tool_calls: [
            { function: { arguments: '', name: 'lookup_balance' }, id: 'call_1', index: 0 },
          ],
        }),
        chunk({ tool_calls: [{ function: { arguments: '{"acc' }, index: 0 }] }),
        chunk({ tool_calls: [{ function: { arguments: 'ount":"a"}' }, index: 0 }] }),
        chunk({}, 'tool_calls'),
        'data: [DONE]',
        '',
      ])) as unknown as typeof fetch

    const backend = createOpenRouterBackend('or-fake-key')
    const collected = []
    for await (const message of backend.run(
      { messages: [{ content: 'qual meu saldo?', role: 'user' }] },
      { model: 'anthropic/claude-3.5-haiku', organizationId: 'org_a' },
    )) {
      collected.push(message)
    }

    expect(collected).toEqual([
      { id: 'call_1', input: { account: 'a' }, kind: 'tool-use', name: 'lookup_balance' },
      { kind: 'status', status: 'completed' },
    ])
  })

  test('yields an error message and a failed status on a non-2xx response', async () => {
    globalThis.fetch = (async () =>
      new Response('rate limited', { status: 429 })) as unknown as typeof fetch

    const backend = createOpenRouterBackend('or-fake-key')
    const collected = []
    for await (const message of backend.run(
      { messages: [{ content: 'oi', role: 'user' }] },
      { model: 'anthropic/claude-3.5-haiku', organizationId: 'org_a' },
    )) {
      collected.push(message)
    }

    expect(collected).toEqual([
      { code: 'openrouter_http_error', kind: 'error', message: 'HTTP 429: rate limited' },
      { kind: 'status', status: 'failed' },
    ])
  })
})
