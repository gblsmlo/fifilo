import Anthropic from '@anthropic-ai/sdk'

import type { AgentBackend, AgentInput, RunOptions } from './backend'
import { capErrorBuffer, withGuardrails } from './guardrails'
import type { AgentMessage, RunStatus } from './message'

const STOP_REASON_TO_STATUS: Record<string, RunStatus> = {
  end_turn: 'completed',
  max_tokens: 'completed',
  stop_sequence: 'completed',
  tool_use: 'completed',
}

/**
 * One raw Anthropic stream event to zero or one `AgentMessage` - a pure
 * mapping, tested with synthetic events (Anthropic's own documented shape
 * for `messages.create({ stream: true })`) since no live key ran against
 * this in the session that wrote it. `null` means "no product-visible
 * event for this one" (e.g. `content_block_start` for a text block carries
 * nothing yet; the text itself arrives in the following `_delta` events).
 */
export const mapAnthropicEvent = (event: Anthropic.MessageStreamEvent): AgentMessage | null => {
  switch (event.type) {
    case 'content_block_delta': {
      if (event.delta.type === 'text_delta') return { kind: 'text', text: event.delta.text }
      if (event.delta.type === 'thinking_delta') {
        return { kind: 'thinking', text: event.delta.thinking }
      }
      return null
    }
    case 'content_block_start': {
      if (event.content_block.type === 'tool_use') {
        return {
          id: event.content_block.id,
          input: event.content_block.input,
          kind: 'tool-use',
          name: event.content_block.name,
        }
      }
      return null
    }
    case 'message_delta': {
      const status = event.delta.stop_reason
        ? (STOP_REASON_TO_STATUS[event.delta.stop_reason] ?? 'completed')
        : null
      return status ? { kind: 'status', status } : null
    }
    default:
      return null
  }
}

const createRawAnthropicBackend = (apiKey: string): AgentBackend => {
  const client = new Anthropic({ apiKey })

  return {
    provider: 'anthropic',
    async *run(input: AgentInput, options: RunOptions): AsyncIterable<AgentMessage> {
      try {
        const stream = client.messages.stream(
          {
            max_tokens: options.maxOutputTokens ?? 1024,
            messages: input.messages.map((message) => ({
              content: message.content,
              role: message.role,
            })),
            model: options.model,
            system: input.systemPrompt,
            tools: input.tools?.map((tool) => ({
              description: tool.description,
              input_schema: tool.inputSchema as Anthropic.Tool.InputSchema,
              name: tool.name,
            })),
          },
          { signal: options.signal },
        )

        for await (const event of stream) {
          const message = mapAnthropicEvent(event)
          if (message) yield message
        }
      } catch (error) {
        const raw = error instanceof Error ? error.message : String(error)
        yield { code: 'anthropic_error', kind: 'error', message: capErrorBuffer(raw) }
        yield { kind: 'status', status: 'failed' }
      }
    },
  }
}

export const createAnthropicBackend = (apiKey: string): AgentBackend =>
  withGuardrails(createRawAnthropicBackend(apiKey))
