import type { AgentBackend, AgentInput, RunOptions } from './backend'
import { capErrorBuffer, withGuardrails } from './guardrails'
import type { AgentMessage, RunStatus } from './message'

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions'

const FINISH_REASON_TO_STATUS: Record<string, RunStatus> = {
  content_filter: 'completed',
  length: 'completed',
  stop: 'completed',
  tool_calls: 'completed',
}

type OpenRouterToolCallDelta = {
  function?: { arguments?: string; name?: string }
  id?: string
  index: number
}

type OpenRouterChunk = {
  choices?: Array<{
    delta?: { content?: string; tool_calls?: OpenRouterToolCallDelta[] }
    finish_reason?: string | null
  }>
}

/**
 * One SSE `data:` payload (already stripped of the prefix) to a parsed
 * chunk, or the `'done'` sentinel OpenRouter's stream (OpenAI-compatible)
 * ends every response with. Pure and tested directly - the network read
 * around it is the only part a live key would still need to prove.
 */
export const parseOpenRouterSseData = (raw: string): OpenRouterChunk | 'done' | null => {
  const trimmed = raw.trim()
  if (!trimmed) return null
  if (trimmed === '[DONE]') return 'done'
  try {
    return JSON.parse(trimmed) as OpenRouterChunk
  } catch {
    return null
  }
}

/**
 * Splits a raw SSE byte stream into individual `data:` payload strings.
 * OpenRouter (like every OpenAI-compatible endpoint) frames one event per
 * line, ended by a blank line; a line not starting with `data:` (a `:`
 * comment, a stray blank) yields nothing.
 */
async function* readSseData(body: ReadableStream<Uint8Array>): AsyncGenerator<string> {
  const reader = body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      buffer += decoder.decode(value, { stream: true })

      const lines = buffer.split('\n')
      buffer = lines.pop() ?? ''
      for (const line of lines) {
        if (line.startsWith('data:')) yield line.slice('data:'.length)
      }
    }
  } finally {
    reader.releaseLock()
  }
}

/**
 * Accumulates a tool call's `arguments` across however many deltas the
 * stream splits it into, keyed by the call's own `index` - OpenAI-compatible
 * streams send the function name once and the JSON arguments in fragments.
 */
class ToolCallAccumulator {
  private readonly calls = new Map<number, { arguments: string; id: string; name: string }>()

  ingest(delta: OpenRouterToolCallDelta): void {
    const existing = this.calls.get(delta.index) ?? { arguments: '', id: '', name: '' }
    this.calls.set(delta.index, {
      arguments: existing.arguments + (delta.function?.arguments ?? ''),
      id: delta.id ?? existing.id,
      name: delta.function?.name ?? existing.name,
    })
  }

  drain(): AgentMessage[] {
    const messages: AgentMessage[] = []
    for (const call of this.calls.values()) {
      let input: unknown = {}
      try {
        input = call.arguments ? JSON.parse(call.arguments) : {}
      } catch {
        input = { raw: call.arguments }
      }
      messages.push({ id: call.id, input, kind: 'tool-use', name: call.name })
    }
    this.calls.clear()
    return messages
  }
}

const createRawOpenRouterBackend = (apiKey: string): AgentBackend => ({
  provider: 'openrouter',
  async *run(input: AgentInput, options: RunOptions): AsyncIterable<AgentMessage> {
    const messages = input.systemPrompt
      ? [{ content: input.systemPrompt, role: 'system' as const }, ...input.messages]
      : input.messages

    try {
      const response = await fetch(OPENROUTER_URL, {
        body: JSON.stringify({
          max_tokens: options.maxOutputTokens,
          messages,
          model: options.model,
          stream: true,
          tools: input.tools?.map((tool) => ({
            function: {
              description: tool.description,
              name: tool.name,
              parameters: tool.inputSchema,
            },
            type: 'function',
          })),
        }),
        headers: {
          authorization: `Bearer ${apiKey}`,
          'content-type': 'application/json',
        },
        method: 'POST',
        signal: options.signal,
      })

      if (!response.ok || !response.body) {
        const body = await response.text().catch(() => '')
        yield {
          code: 'openrouter_http_error',
          kind: 'error',
          message: capErrorBuffer(`HTTP ${response.status}: ${body}`),
        }
        yield { kind: 'status', status: 'failed' }
        return
      }

      const toolCalls = new ToolCallAccumulator()

      for await (const raw of readSseData(response.body)) {
        const chunk = parseOpenRouterSseData(raw)
        if (chunk === null) continue
        if (chunk === 'done') break

        const choice = chunk.choices?.[0]
        if (!choice) continue

        if (choice.delta?.content) yield { kind: 'text', text: choice.delta.content }
        for (const toolCall of choice.delta?.tool_calls ?? []) toolCalls.ingest(toolCall)

        if (choice.finish_reason) {
          yield* toolCalls.drain()
          yield {
            kind: 'status',
            status: FINISH_REASON_TO_STATUS[choice.finish_reason] ?? 'completed',
          }
        }
      }
    } catch (error) {
      const raw = error instanceof Error ? error.message : String(error)
      yield { code: 'openrouter_error', kind: 'error', message: capErrorBuffer(raw) }
      yield { kind: 'status', status: 'failed' }
    }
  },
})

export const createOpenRouterBackend = (apiKey: string): AgentBackend =>
  withGuardrails(createRawOpenRouterBackend(apiKey))
