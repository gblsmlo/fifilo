import type { EntityId } from '../primitives'
import type {
  Conversation,
  Message,
  MessageAuthorType,
  MessageContent,
  MessageRole,
} from './conversation'

export type CreateConversationInput = {
  createdBy: EntityId
  organizationId: string
  title: string | null
}

export type AppendMessageInput = {
  authorId: EntityId | null
  authorType: MessageAuthorType
  content: MessageContent
  conversationId: EntityId
  organizationId: string
  role: MessageRole
  toolCallId: string | null
  tokenUsage: { inputTokens: number; outputTokens: number } | null
}

export type ConversationRepository = {
  create: (input: CreateConversationInput) => Promise<Conversation>
  findById: (organizationId: string, id: EntityId) => Promise<Conversation | null>
  list: (organizationId: string, createdBy: EntityId) => Promise<Conversation[]>
  setProviderSessionId: (
    organizationId: string,
    id: EntityId,
    providerSessionId: string,
  ) => Promise<void>
}

export type MessageRepository = {
  append: (input: AppendMessageInput) => Promise<Message>
  listByConversation: (organizationId: string, conversationId: EntityId) => Promise<Message[]>
}
