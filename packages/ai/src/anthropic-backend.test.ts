import { describe, expect, test } from 'bun:test'
import type Anthropic from '@anthropic-ai/sdk'

import { createAnthropicBackend, mapAnthropicEvent } from './anthropic-backend'
import { runBackendContract } from './contract'

const hasKey = Boolean(process.env.ANTHROPIC_API_KEY)

runBackendContract('anthropic', () => createAnthropicBackend(process.env.ANTHROPIC_API_KEY ?? ''), {
  model: 'claude-haiku-4-5-20251001',
  skipLiveRun: !hasKey,
})

/**
 * Synthetic events shaped exactly as Anthropic's own documented
 * `MessageStreamEvent` union for `messages.create({ stream: true })` - no
 * live key ran against this mapping in the session that wrote it, so this
 * is the one place that carries the actual verification until one does.
 */
describe('mapAnthropicEvent', () => {
  test('maps a text delta to a text message', () => {
    const event = {
      delta: { text: 'olá', type: 'text_delta' },
      index: 0,
      type: 'content_block_delta',
    } as Anthropic.MessageStreamEvent

    expect(mapAnthropicEvent(event)).toEqual({ kind: 'text', text: 'olá' })
  })

  test('maps a thinking delta to a thinking message', () => {
    const event = {
      delta: { thinking: 'considerando...', type: 'thinking_delta' },
      index: 0,
      type: 'content_block_delta',
    } as Anthropic.MessageStreamEvent

    expect(mapAnthropicEvent(event)).toEqual({ kind: 'thinking', text: 'considerando...' })
  })

  test('ignores an input_json_delta - tool input arrives complete in content_block_start', () => {
    const event = {
      delta: { partial_json: '{"a":1}', type: 'input_json_delta' },
      index: 0,
      type: 'content_block_delta',
    } as Anthropic.MessageStreamEvent

    expect(mapAnthropicEvent(event)).toBeNull()
  })

  test('maps a tool_use content block start to a tool-use message', () => {
    const event = {
      content_block: { id: 'toolu_1', input: {}, name: 'lookup_balance', type: 'tool_use' },
      index: 0,
      type: 'content_block_start',
    } as Anthropic.MessageStreamEvent

    expect(mapAnthropicEvent(event)).toEqual({
      id: 'toolu_1',
      input: {},
      kind: 'tool-use',
      name: 'lookup_balance',
    })
  })

  test('ignores a text content block start - the text itself arrives in deltas', () => {
    const event = {
      content_block: { citations: [], text: '', type: 'text' },
      index: 0,
      type: 'content_block_start',
    } as Anthropic.MessageStreamEvent

    expect(mapAnthropicEvent(event)).toBeNull()
  })

  test('maps message_delta`s stop_reason to a completed status', () => {
    const event = {
      delta: { stop_reason: 'end_turn', stop_sequence: null },
      type: 'message_delta',
      usage: { output_tokens: 12 },
    } as Anthropic.MessageStreamEvent

    expect(mapAnthropicEvent(event)).toEqual({ kind: 'status', status: 'completed' })
  })

  test('ignores message_start and message_stop - no product-visible event either carries', () => {
    const start = { message: {}, type: 'message_start' } as Anthropic.MessageStreamEvent
    const stop = { type: 'message_stop' } as Anthropic.MessageStreamEvent

    expect(mapAnthropicEvent(start)).toBeNull()
    expect(mapAnthropicEvent(stop)).toBeNull()
  })
})

describe('createAnthropicBackend', () => {
  test('constructs without a network call - the client is lazy until run() streams', () => {
    expect(() => createAnthropicBackend('sk-ant-fake-for-construction-only')).not.toThrow()
  })
})
