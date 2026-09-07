import { describe, expect, test } from 'bun:test'
import { generateEntityId } from '../../primitives'
import { createFakeAiRunRepository } from './fake-ai-repositories'
import { startRun } from './start-run'

describe('startRun', () => {
  test('returns an id and a start time', async () => {
    const result = await startRun(
      {
        actorId: generateEntityId(),
        actorType: 'user',
        kind: 'chat',
        model: 'claude-haiku-4-5',
        organizationId: 'org_1',
        provider: 'anthropic',
      },
      createFakeAiRunRepository(),
    )

    expect(result.id).toBeTruthy()
    expect(result.startedAt).toBeInstanceOf(Date)
  })
})
