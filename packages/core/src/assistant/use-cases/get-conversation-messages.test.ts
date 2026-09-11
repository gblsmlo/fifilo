import { describe, expect, test } from 'bun:test'
import { generateEntityId } from '../../primitives'
import { appendMessage } from './append-message'
import { createConversation } from './create-conversation'
import {
  createFakeConversationRepository,
  createFakeMessageRepository,
} from './fake-assistant-repositories'
import { getConversationMessages } from './get-conversation-messages'

describe('getConversationMessages', () => {
  test('returns the conversation`s own messages, in order', async () => {
    const conversations = createFakeConversationRepository()
    const messages = createFakeMessageRepository()
    const userId = generateEntityId()
    const conversation = await createConversation(
      { createdBy: userId, organizationId: 'org_1', title: null },
      conversations,
    )

    await appendMessage(
      {
        authorId: userId,
        authorType: 'member',
        content: { kind: 'text', text: 'quanto gastei em setembro?' },
        conversationId: conversation.id,
        organizationId: 'org_1',
        role: 'user',
        toolCallId: null,
        tokenUsage: null,
      },
      messages,
    )
    await appendMessage(
      {
        authorId: null,
        authorType: 'agent',
        content: { kind: 'text', text: 'Você gastou R$ 300,00.' },
        conversationId: conversation.id,
        organizationId: 'org_1',
        role: 'assistant',
        toolCallId: null,
        tokenUsage: { inputTokens: 50, outputTokens: 12 },
      },
      messages,
    )

    const result = await getConversationMessages(
      { conversationId: conversation.id, createdBy: userId, organizationId: 'org_1' },
      conversations,
      messages,
    )

    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.value).toHaveLength(2)
      expect(result.value[1]?.authorType).toBe('agent')
    }
  })

  test('answers not_found for another member`s conversation, even in the same organization', async () => {
    const conversations = createFakeConversationRepository()
    const messages = createFakeMessageRepository()
    const owner = generateEntityId()
    const someoneElse = generateEntityId()
    const conversation = await createConversation(
      { createdBy: owner, organizationId: 'org_1', title: null },
      conversations,
    )

    const result = await getConversationMessages(
      { conversationId: conversation.id, createdBy: someoneElse, organizationId: 'org_1' },
      conversations,
      messages,
    )

    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error.code).toBe('conversation_not_found')
  })

  test('answers not_found for a conversation from another organization', async () => {
    const conversations = createFakeConversationRepository()
    const messages = createFakeMessageRepository()
    const userId = generateEntityId()
    const conversation = await createConversation(
      { createdBy: userId, organizationId: 'org_1', title: null },
      conversations,
    )

    const result = await getConversationMessages(
      { conversationId: conversation.id, createdBy: userId, organizationId: 'org_2' },
      conversations,
      messages,
    )

    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error.code).toBe('conversation_not_found')
  })
})
