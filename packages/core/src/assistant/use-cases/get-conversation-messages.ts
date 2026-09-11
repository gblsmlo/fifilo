import { type DomainError, notFoundError } from '../../errors'
import type { EntityId } from '../../primitives'
import { type Result, err, ok } from '../../result'
import type { Message } from '../conversation'
import type { ConversationRepository, MessageRepository } from '../ports'

export type GetConversationMessagesQuery = {
  conversationId: EntityId
  createdBy: EntityId
  organizationId: string
}

export type GetConversationMessagesError = DomainError<'not_found', 'conversation_not_found'>

/** `createdBy` proves ownership before any message is read - the same conversation id from a different member's own chat answers not_found, not someone else's history. */
export const getConversationMessages = async (
  query: GetConversationMessagesQuery,
  conversations: ConversationRepository,
  messages: MessageRepository,
): Promise<Result<Message[], GetConversationMessagesError>> => {
  const conversation = await conversations.findById(query.organizationId, query.conversationId)
  if (!conversation || conversation.createdBy !== query.createdBy) {
    return err(notFoundError('conversation_not_found', 'Conversation not found.'))
  }

  return ok(await messages.listByConversation(query.organizationId, query.conversationId))
}
