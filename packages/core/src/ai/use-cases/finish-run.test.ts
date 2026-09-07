import { describe, expect, test } from 'bun:test'
import { generateEntityId } from '../../primitives'
import { createFakeAiRunRepository } from './fake-ai-repositories'
import { finishRun } from './finish-run'
import { startRun } from './start-run'

const ORGANIZATION_ID = 'org_1'

describe('finishRun', () => {
  test('records the final token counts, cost and status of a started run', async () => {
    const repository = createFakeAiRunRepository()
    const { id } = await startRun(
      {
        actorId: generateEntityId(),
        actorType: 'user',
        kind: 'chat',
        model: 'claude-haiku-4-5',
        organizationId: ORGANIZATION_ID,
        provider: 'anthropic',
      },
      repository,
    )

    const result = await finishRun(
      {
        costMinor: 12,
        currency: 'BRL',
        error: null,
        id,
        inputTokens: 100,
        organizationId: ORGANIZATION_ID,
        outputTokens: 40,
        status: 'completed',
      },
      repository,
    )

    expect(result).toEqual({ ok: true, value: true })
  })

  test('answers not_found for an unknown run id', async () => {
    const result = await finishRun(
      {
        costMinor: 0,
        currency: 'BRL',
        error: null,
        id: generateEntityId(),
        inputTokens: 0,
        organizationId: ORGANIZATION_ID,
        outputTokens: 0,
        status: 'failed',
      },
      createFakeAiRunRepository(),
    )

    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error.code).toBe('ai_run_not_found')
  })

  test('answers not_found when the run belongs to another organization', async () => {
    const repository = createFakeAiRunRepository()
    const { id } = await startRun(
      {
        actorId: generateEntityId(),
        actorType: 'user',
        kind: 'chat',
        model: 'claude-haiku-4-5',
        organizationId: ORGANIZATION_ID,
        provider: 'anthropic',
      },
      repository,
    )

    const result = await finishRun(
      {
        costMinor: 0,
        currency: 'BRL',
        error: null,
        id,
        inputTokens: 0,
        organizationId: 'org_other',
        outputTokens: 0,
        status: 'completed',
      },
      repository,
    )

    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error.code).toBe('ai_run_not_found')
  })
})
