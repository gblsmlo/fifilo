import type { AgentBackend, AgentInput, RunOptions } from './backend'
import type { AgentMessage } from './message'

const MAX_ERROR_BUFFER_BYTES = 64 * 1024

/**
 * A provider's own error body can be arbitrarily large; without a cap, a
 * failure diagnosis becomes a memory and log-volume problem of its own
 * (Fase 07 § Guardrails #6, the same 64 KB buffer Multica caps its own
 * daemon's captured stderr at).
 */
export const capErrorBuffer = (text: string, maxBytes = MAX_ERROR_BUFFER_BYTES): string => {
  const bytes = new TextEncoder().encode(text)
  if (bytes.byteLength <= maxBytes) return text
  return `${new TextDecoder().decode(bytes.subarray(0, maxBytes))}… [truncated]`
}

/**
 * Every adapter is wrapped in this before the app ever holds a reference to
 * it (Fase 07 § Guardrails #1) - an execution with no `organizationId`, or
 * one a caller built by hand without going through the type system, is
 * refused before any network call, not after one fails in some other way.
 */
export const withRequiredContext = (backend: AgentBackend): AgentBackend => ({
  provider: backend.provider,
  async *run(input: AgentInput, options: RunOptions): AsyncIterable<AgentMessage> {
    if (!options.organizationId) {
      yield {
        code: 'missing_organization_context',
        kind: 'error',
        message: 'An AI run requires an organizationId.',
      }
      return
    }

    yield* backend.run(input, options)
  },
})

/**
 * `options.timeoutMs` aborts the run from the caller's side - a provider
 * that never closes its stream must not hang the request that awaits it
 * forever (Fase 07 § Guardrails #6).
 */
export const withTimeout = (backend: AgentBackend): AgentBackend => ({
  provider: backend.provider,
  async *run(input: AgentInput, options: RunOptions): AsyncIterable<AgentMessage> {
    if (!options.timeoutMs) {
      yield* backend.run(input, options)
      return
    }

    const controller = new AbortController()
    const forwardAbort = () => controller.abort()
    options.signal?.addEventListener('abort', forwardAbort)
    const timer = setTimeout(() => controller.abort(), options.timeoutMs)

    try {
      yield* backend.run(input, { ...options, signal: controller.signal })
    } catch (error) {
      if (controller.signal.aborted) {
        yield { code: 'timeout', kind: 'error', message: `Run exceeded ${options.timeoutMs}ms.` }
        return
      }
      throw error
    } finally {
      clearTimeout(timer)
      options.signal?.removeEventListener('abort', forwardAbort)
    }
  },
})

/** The order every real adapter's factory applies these in (context checked before a timer ever starts). */
export const withGuardrails = (backend: AgentBackend): AgentBackend =>
  withRequiredContext(withTimeout(backend))
