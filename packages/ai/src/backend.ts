import type { AgentMessage } from './message'

export type AgentRole = 'assistant' | 'user'

export type AgentInputMessage = {
  content: string
  role: AgentRole
}

export type AgentToolDefinition = {
  description: string
  inputSchema: Record<string, unknown>
  name: string
}

export type AgentInput = {
  messages: AgentInputMessage[]
  systemPrompt?: string
  tools?: AgentToolDefinition[]
}

export type RunOptions = {
  maxOutputTokens?: number
  model: string
  /**
   * Never optional at the type level, but a caller can still pass an empty
   * string at runtime - `withRequiredContext` is what actually enforces
   * this (Fase 07 § Guardrails, "contexto obrigatório").
   */
  organizationId: string
  signal?: AbortSignal
  timeoutMs?: number
}

/**
 * The one interface every provider adapter implements (Fase 07 §
 * Modelagem) - `packages/ai` never builds an agent loop, only wraps a
 * provider's SDK and normalizes its stream into `AgentMessage`.
 */
export type AgentBackend = {
  readonly provider: string
  run(input: AgentInput, options: RunOptions): AsyncIterable<AgentMessage>
}
