/**
 * The taxonomy every adapter normalizes its provider's own event stream
 * into (Fase 07 § "A lição central da referência", adapted from Multica):
 * the rest of the product reads one shape regardless of which provider ran.
 */
export type AgentMessage =
  | { kind: 'text'; text: string }
  | { kind: 'thinking'; text: string }
  | { kind: 'tool-use'; id: string; name: string; input: unknown }
  | { kind: 'tool-result'; toolUseId: string; output: unknown; isError?: boolean }
  | { kind: 'status'; status: RunStatus }
  | { kind: 'error'; code: string; message: string }

export type RunStatus = 'completed' | 'failed' | 'aborted' | 'timeout' | 'cancelled'
