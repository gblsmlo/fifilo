import { describe, expect, test } from 'bun:test'
import { generateEntityId } from '../../primitives'
import { createConversation } from './create-conversation'
import { createFakeConversationRepository } from './fake-assistant-repositories'

describe('createConversation', () => {
  test('creates a conversation with no provider session yet', async () => {
    const conversation = await createConversation(
      { createdBy: generateEntityId(), organizationId: 'org_1', title: 'Gastos de setembro' },
      createFakeConversationRepository(),
    )

    expect(conversation.providerSessionId).toBeNull()
    expect(conversation.archivedAt).toBeNull()
    expect(conversation.title).toBe('Gastos de setembro')
  })

  test('a viewer can start a conversation - no role is gated (every tool is read-only)', async () => {
    const conversation = await createConversation(
      { createdBy: generateEntityId(), organizationId: 'org_1', title: null },
      createFakeConversationRepository(),
    )

    expect(conversation.id).toBeTruthy()
  })
})
