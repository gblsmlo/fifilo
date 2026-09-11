import { z } from 'zod'

export const conversationResponseSchema = z.object({
  archivedAt: z.iso.datetime().nullable(),
  createdAt: z.iso.datetime(),
  id: z.string().min(1),
  providerSessionId: z.string().nullable(),
  title: z.string().nullable(),
})

export const createConversationRequestSchema = z.object({
  title: z.string().min(1).max(200).nullable().optional(),
})

export const messageContentSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('text'), text: z.string() }),
  z.object({
    input: z.unknown(),
    id: z.string().min(1),
    kind: z.literal('tool-call'),
    name: z.string(),
  }),
  z.object({
    isError: z.boolean().optional(),
    kind: z.literal('tool-result'),
    output: z.unknown(),
    toolCallId: z.string().min(1),
  }),
])

export const messageResponseSchema = z.object({
  authorId: z.string().nullable(),
  authorType: z.enum(['agent', 'member']),
  content: messageContentSchema,
  createdAt: z.iso.datetime(),
  id: z.string().min(1),
  role: z.enum(['assistant', 'system', 'user']),
  tokenUsage: z.object({ inputTokens: z.int(), outputTokens: z.int() }).nullable(),
})

export const sendMessageRequestSchema = z.object({
  content: z.string().min(1).max(4_000),
})

const assistantErrorCodeSchema = z.enum([
  'ai_budget_exceeded',
  'ai_disabled_for_workspace',
  'ai_disabled_globally',
  'conversation_not_found',
  'tool_input_invalid',
  'tool_not_found',
])

export const assistantErrorResponseSchema = z.object({
  error: z.object({
    code: assistantErrorCodeSchema,
    message: z.string().min(1),
  }),
})

export type ConversationResponse = z.infer<typeof conversationResponseSchema>
export type CreateConversationRequest = z.infer<typeof createConversationRequestSchema>
export type MessageResponse = z.infer<typeof messageResponseSchema>
export type SendMessageRequest = z.infer<typeof sendMessageRequestSchema>
export type AssistantErrorResponse = z.infer<typeof assistantErrorResponseSchema>
