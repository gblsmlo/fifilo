import { generateEntityId } from '../../primitives'
import type { Conversation, Message } from '../conversation'
import type { ConversationRepository, MessageRepository } from '../ports'

export const createFakeConversationRepository = (
  seed: Conversation[] = [],
): ConversationRepository => {
  const conversations = new Map(seed.map((conversation) => [conversation.id, conversation]))

  return {
    async create(input) {
      const conversation: Conversation = {
        archivedAt: null,
        createdAt: new Date(),
        createdBy: input.createdBy,
        id: generateEntityId(),
        organizationId: input.organizationId,
        providerSessionId: null,
        title: input.title,
      }
      conversations.set(conversation.id, conversation)
      return conversation
    },
    async findById(organizationId, id) {
      const conversation = conversations.get(id)
      return conversation && conversation.organizationId === organizationId ? conversation : null
    },
    async list(organizationId, createdBy) {
      return [...conversations.values()].filter(
        (conversation) =>
          conversation.organizationId === organizationId && conversation.createdBy === createdBy,
      )
    },
    async setProviderSessionId(organizationId, id, providerSessionId) {
      const conversation = conversations.get(id)
      if (!conversation || conversation.organizationId !== organizationId) return
      conversations.set(id, { ...conversation, providerSessionId })
    },
  }
}

export const createFakeMessageRepository = (seed: Message[] = []): MessageRepository => {
  const messages = [...seed]

  return {
    async append(input) {
      const message: Message = {
        authorId: input.authorId,
        authorType: input.authorType,
        content: input.content,
        conversationId: input.conversationId,
        createdAt: new Date(),
        id: generateEntityId(),
        organizationId: input.organizationId,
        role: input.role,
        toolCallId: input.toolCallId,
        tokenUsage: input.tokenUsage,
      }
      messages.push(message)
      return message
    },
    async listByConversation(organizationId, conversationId) {
      return messages.filter(
        (message) =>
          message.organizationId === organizationId && message.conversationId === conversationId,
      )
    },
  }
}
