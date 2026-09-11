import { describe, expect, test } from 'bun:test'
import { generateEntityId } from '../../primitives'
import { createConversation } from './create-conversation'
import { createFakeConversationRepository } from './fake-assistant-repositories'
import { listConversations } from './list-conversations'

describe('listConversations', () => {
  test('a member sees only the conversations they started, even inside the same organization', async () => {
    const repository = createFakeConversationRepository()
    const userA = generateEntityId()
    const userB = generateEntityId()

    await createConversation({ createdBy: userA, organizationId: 'org_1', title: 'A' }, repository)
    await createConversation({ createdBy: userB, organizationId: 'org_1', title: 'B' }, repository)

    const mine = await listConversations({ createdBy: userA, organizationId: 'org_1' }, repository)

    expect(mine.map((conversation) => conversation.title)).toEqual(['A'])
  })

  test('never sees another organization`s conversations', async () => {
    const repository = createFakeConversationRepository()
    const user = generateEntityId()

    await createConversation(
      { createdBy: user, organizationId: 'org_1', title: 'Mine' },
      repository,
    )
    await createConversation(
      { createdBy: user, organizationId: 'org_2', title: 'Theirs' },
      repository,
    )

    const mine = await listConversations({ createdBy: user, organizationId: 'org_1' }, repository)

    expect(mine.map((conversation) => conversation.title)).toEqual(['Mine'])
  })
})
