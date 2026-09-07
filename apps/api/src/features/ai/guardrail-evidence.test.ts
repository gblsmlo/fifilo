import { describe, expect, test } from 'bun:test'
import { redactPersonalData } from '@fifilo/ai'
import { createStubBackend } from '@fifilo/ai/stub'
import { recordSpend } from '@fifilo/core/ai'

import {
  createFakeAiBudgetRepository,
  createFakeAiKillSwitchRepository,
  createFakeAiRunRepository,
} from './ai-test-support'
import { guardAiRun } from './guard-run'

const ORGANIZATION_ID = 'org_1'
const PERIOD = '2026-09'

/**
 * Fase 07 § Critério de conclusão asks for evidence that the guardrails
 * work *together*, not only each in isolation - the shape Fase 08's chat
 * route will actually call them in, end to end, with the stub backend
 * standing in for whichever real provider a workspace configures.
 */
describe('the AI guardrail chain, end to end', () => {
  test('guards, redacts, runs, records the spend and finishes the run - none of it leaks the redacted PII', async () => {
    const killSwitchRepository = createFakeAiKillSwitchRepository()
    const budgetRepository = createFakeAiBudgetRepository()
    const runRepository = createFakeAiRunRepository()

    const guard = await guardAiRun(
      { organizationId: ORGANIZATION_ID, period: PERIOD },
      killSwitchRepository,
      budgetRepository,
    )
    expect(guard.ok).toBe(true)

    const { entries, input } = redactPersonalData(
      {
        messages: [
          {
            content: 'Sou Ana Souza, e-mail ana.souza@example.com. Como estão meus gastos?',
            role: 'user',
          },
        ],
      },
      ['Ana Souza'],
    )
    expect(input.messages[0]?.content).not.toContain('Ana Souza')
    expect(input.messages[0]?.content).not.toContain('ana.souza@example.com')
    expect(entries).toHaveLength(2)

    const { id: runId } = await runRepository.start({
      actorId: null,
      actorType: 'user',
      kind: 'chat',
      model: 'stub-model',
      organizationId: ORGANIZATION_ID,
      provider: 'stub',
    })

    const backend = createStubBackend({
      messages: [
        { kind: 'text', text: `Olá ${entries[0]?.reference}, seus gastos somam R$ 300,00.` },
        { kind: 'status', status: 'completed' },
      ],
    })

    const collected = []
    for await (const message of backend.run(input, {
      model: 'stub-model',
      organizationId: ORGANIZATION_ID,
    })) {
      collected.push(message)
    }

    // The response references the redacted placeholder, never the name it
    // stands for - resolving it back to "Ana Souza" is the server's own job
    // on the way out, never something the provider (here, the stub) does.
    const textMessage = collected.find((message) => message.kind === 'text')
    expect(textMessage && 'text' in textMessage ? textMessage.text : '').toContain(
      entries[0]?.reference ?? '',
    )
    expect(JSON.stringify(collected)).not.toContain('Ana Souza')

    const finished = await runRepository.finish(ORGANIZATION_ID, {
      costMinor: 15,
      currency: 'BRL',
      error: null,
      id: runId,
      inputTokens: 42,
      outputTokens: 18,
      status: 'completed',
    })
    expect(finished).toBe(true)

    const budget = await recordSpend(
      { amountMinor: 15, organizationId: ORGANIZATION_ID, period: PERIOD },
      budgetRepository,
    )
    expect(budget.consumedMinor).toBe(15)
  })

  test('turning the kill switch on mid-session blocks the next guard check without breaking the product', async () => {
    const killSwitchRepository = createFakeAiKillSwitchRepository()
    const budgetRepository = createFakeAiBudgetRepository()

    const before = await guardAiRun(
      { organizationId: ORGANIZATION_ID, period: PERIOD },
      killSwitchRepository,
      budgetRepository,
    )
    expect(before.ok).toBe(true)

    await killSwitchRepository.setWorkspace(ORGANIZATION_ID, true, null)

    const during = await guardAiRun(
      { organizationId: ORGANIZATION_ID, period: PERIOD },
      killSwitchRepository,
      budgetRepository,
    )
    expect(during.ok).toBe(false)
    if (!during.ok) expect(during.error.code).toBe('ai_disabled_for_workspace')

    // The product keeps working (Fase 07 § Guardrails #4): every other
    // guarded surface, and the switch's own read, answer normally - nothing
    // throws, nothing else falls over.
    await killSwitchRepository.setWorkspace(ORGANIZATION_ID, false, null)
    const after = await guardAiRun(
      { organizationId: ORGANIZATION_ID, period: PERIOD },
      killSwitchRepository,
      budgetRepository,
    )
    expect(after.ok).toBe(true)
  })
})
