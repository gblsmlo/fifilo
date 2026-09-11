import type { EntityId } from '../../primitives'
import type { Conversation } from '../conversation'
import type { ConversationRepository } from '../ports'

export type ListConversationsQuery = {
  createdBy: EntityId
  organizationId: string
}

/** Each member sees only their own conversations - `createdBy` scopes the read, not just `organizationId`. */
export const listConversations = (
  query: ListConversationsQuery,
  repository: ConversationRepository,
): Promise<Conversation[]> => repository.list(query.organizationId, query.createdBy)
