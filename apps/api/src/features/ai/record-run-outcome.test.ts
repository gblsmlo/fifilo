import { describe, expect, test } from 'bun:test'
import { generateEntityId } from '@fifilo/core/primitives'

import { createFakeAiBudgetRepository, createFakeAiRunRepository } from './ai-test-support'
import { recordRunOutcome } from './record-run-outcome'

const ORGANIZATION_ID = 'org_1'
const PERIOD = '2026-09'

describe('recordRunOutcome', () => {
  test('finishes the run, records the spend and audits the outcome', async () => {
    const runRepository = createFakeAiRunRepository()
    const budgetRepository = createFakeAiBudgetRepository()
    const events: unknown[] = []

    const result = await recordRunOutcome(
      {
        actorId: generateEntityId(),
        costMinor: 25,
        currency: 'BRL',
        error: null,
        id: generateEntityId(),
        inputTokens: 80,
        organizationId: ORGANIZATION_ID,
        outputTokens: 30,
        period: PERIOD,
        status: 'completed',
      },
      runRepository,
      budgetRepository,
      (event) => events.push(event),
    )

    expect(result).toEqual({ ok: true, value: true })
    expect((await budgetRepository.findByPeriod(ORGANIZATION_ID, PERIOD))?.consumedMinor).toBe(25)
    expect(events).toEqual([
      {
        action: 'ai.run.completed',
        actorId: expect.any(String),
        actorType: 'user',
        entityId: expect.any(String),
        entityType: 'ai_run',
        metadata: { costMinor: 25, status: 'completed' },
        workspaceId: ORGANIZATION_ID,
      },
    ])
  })

  test('a failed run with no cost still finishes and audits, but never touches the budget', async () => {
    const runRepository = createFakeAiRunRepository()
    const budgetRepository = createFakeAiBudgetRepository()
    const events: unknown[] = []

    await recordRunOutcome(
      {
        actorId: null,
        costMinor: 0,
        currency: 'BRL',
        error: 'provider timeout',
        id: generateEntityId(),
        inputTokens: 10,
        organizationId: ORGANIZATION_ID,
        outputTokens: 0,
        period: PERIOD,
        status: 'timeout',
      },
      runRepository,
      budgetRepository,
      (event) => events.push(event),
    )

    expect(await budgetRepository.findByPeriod(ORGANIZATION_ID, PERIOD)).toBeNull()
    expect(events).toHaveLength(1)
  })
})
