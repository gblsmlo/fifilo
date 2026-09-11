import type { EntityId } from '../primitives'

export type Conversation = {
  archivedAt: Date | null
  createdAt: Date
  createdBy: EntityId
  id: EntityId
  organizationId: string
  /** Set as soon as the provider emits one, before the run finishes (Fase 08 § Modelagem, "pinning") - a crash mid-run leaves a usable pointer, not an orphaned conversation. */
  providerSessionId: string | null
  title: string | null
}

/**
 * `member | agent` (Fase 08 § Modelagem, copied from Multica's own
 * `author_type`/`assignee_type`): the agent participates as a first-class
 * author, not a special case bolted onto a member-only shape - one table,
 * one query, one ordering for both.
 */
export type MessageAuthorType = 'agent' | 'member'

export type MessageRole = 'assistant' | 'system' | 'user'

export type MessageContent =
  | { kind: 'text'; text: string }
  | { kind: 'tool-call'; id: string; input: unknown; name: string }
  | { kind: 'tool-result'; isError?: boolean; output: unknown; toolCallId: string }

export type Message = {
  authorId: EntityId | null
  authorType: MessageAuthorType
  content: MessageContent
  conversationId: EntityId
  createdAt: Date
  id: EntityId
  organizationId: string
  role: MessageRole
  toolCallId: string | null
  tokenUsage: { inputTokens: number; outputTokens: number } | null
}
