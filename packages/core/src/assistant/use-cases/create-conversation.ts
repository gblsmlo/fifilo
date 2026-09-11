import type { Conversation } from '../conversation'
import type { ConversationRepository, CreateConversationInput } from '../ports'

/** Any role may start a conversation (Fase 08 § Riscos: a viewer converses; every tool is read-only, so there is nothing here for a role matrix to gate). */
export const createConversation = (
  input: CreateConversationInput,
  repository: ConversationRepository,
): Promise<Conversation> => repository.create(input)
