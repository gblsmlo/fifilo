import { afterAll, beforeAll, describe, expect, test } from 'bun:test'
import type { EntityId } from '@fifilo/core/primitives'
import { generateEntityId } from '@fifilo/core/primitives'
import { db } from '@fifilo/infra-database/client'
import { organizations, users } from '@fifilo/infra-database/schema'
import { withWorkspaceTransactionOn } from '@fifilo/infra-database/workspace'
import { inArray, sql } from 'drizzle-orm'

import { requirePostgres } from '../../test/require-postgres'
import { createAiBudgetRepository } from './ai-budgets-persistence'
import { createAiKillSwitchRepository } from './ai-kill-switch-persistence'
import { createAiRunRepository } from './ai-runs-persistence'

const ORGANIZATION_A = `test_ai_org_a_${generateEntityId()}`
const ORGANIZATION_B = `test_ai_org_b_${generateEntityId()}`
const USER_ID = `test_ai_user_${generateEntityId()}`

const runRepository = createAiRunRepository()
const budgetRepository = createAiBudgetRepository()
const killSwitchRepository = createAiKillSwitchRepository()

beforeAll(async () => {
  await requirePostgres()

  await db.insert(organizations).values([
    { id: ORGANIZATION_A, name: 'Test AI Org A', slug: `${ORGANIZATION_A}-slug` },
    { id: ORGANIZATION_B, name: 'Test AI Org B', slug: `${ORGANIZATION_B}-slug` },
  ])
  await db.insert(users).values({
    email: `${USER_ID}@fifilo.local`,
    emailVerified: true,
    id: USER_ID,
    name: 'Test AI User',
  })
})

afterAll(async () => {
  await db.delete(organizations).where(inArray(organizations.id, [ORGANIZATION_A, ORGANIZATION_B]))
  await db.delete(users).where(inArray(users.id, [USER_ID]))
})

describe('ai_runs persistence', () => {
  test('starts and finishes a run within its own organization', async () => {
    const { id } = await runRepository.start({
      actorId: USER_ID as EntityId,
      actorType: 'user',
      kind: 'chat',
      model: 'claude-haiku-4-5',
      organizationId: ORGANIZATION_A,
      provider: 'anthropic',
    })

    const finished = await runRepository.finish(ORGANIZATION_A, {
      costMinor: 12,
      currency: 'BRL',
      error: null,
      id,
      inputTokens: 100,
      outputTokens: 40,
      status: 'completed',
    })

    expect(finished).toBe(true)
  })

  test('another organization cannot finish the first organization`s run', async () => {
    const { id } = await runRepository.start({
      actorId: USER_ID as EntityId,
      actorType: 'user',
      kind: 'chat',
      model: 'claude-haiku-4-5',
      organizationId: ORGANIZATION_A,
      provider: 'anthropic',
    })

    const finished = await runRepository.finish(ORGANIZATION_B, {
      costMinor: 0,
      currency: 'BRL',
      error: null,
      id,
      inputTokens: 0,
      outputTokens: 0,
      status: 'completed',
    })

    expect(finished).toBe(false)
  })

  test('row-level security rejects a write claiming another organization`s id (WITH CHECK)', async () => {
    const attempt = withWorkspaceTransactionOn(db, ORGANIZATION_B, (tx) =>
      tx.execute(
        sql`insert into ai_runs (organization_id, id, kind, provider, model, status, started_at)
            values (${ORGANIZATION_A}, ${generateEntityId()}, 'chat', 'stub', 'stub', 'completed', now())`,
      ),
    )

    await expect(attempt).rejects.toThrow()
  })

  test('without a workspace context, ai_runs is invisible', async () => {
    const rows = await db.execute(
      sql`select id from ai_runs where organization_id = ${ORGANIZATION_A}`,
    )
    expect([...rows]).toHaveLength(0)
  })

  test('an error mid-transaction rolls back a planted run', async () => {
    const id = generateEntityId()
    const failure = withWorkspaceTransactionOn(db, ORGANIZATION_A, async (tx) => {
      await tx.execute(
        sql`insert into ai_runs (organization_id, id, kind, provider, model, status, started_at)
            values (${ORGANIZATION_A}, ${id}, 'chat', 'stub', 'stub', 'completed', now())`,
      )
      throw new Error('forced rollback')
    })

    await expect(failure).rejects.toThrow('forced rollback')

    const rows = await withWorkspaceTransactionOn(db, ORGANIZATION_A, (tx) =>
      tx.execute(sql`select id from ai_runs where id = ${id}`),
    )
    expect([...rows]).toHaveLength(0)
  })
})

describe('ai_budgets persistence', () => {
  test('recordSpend lazily creates the period`s row', async () => {
    const budget = await budgetRepository.recordSpend(ORGANIZATION_A, '2026-09', 3_000)
    expect(budget.consumedMinor).toBe(3_000)
    expect(budget.limitMinor).toBeNull()
  })

  test('setLimit with expectedVersion 0 fails once the row already exists (recordSpend created it)', async () => {
    const outcome = await budgetRepository.setLimit(
      ORGANIZATION_A,
      '2026-09',
      { currency: 'BRL', limitMinor: 10_000 },
      0,
    )
    expect(outcome).toBe('version_conflict')
  })

  test('another organization cannot find or spend into the first organization`s budget', async () => {
    const foundByB = await budgetRepository.findByPeriod(ORGANIZATION_B, '2026-09')
    expect(foundByB).toBeNull()

    await budgetRepository.recordSpend(ORGANIZATION_B, '2026-09', 500)
    const stillIsolated = await budgetRepository.findByPeriod(ORGANIZATION_A, '2026-09')
    expect(stillIsolated?.consumedMinor).toBe(3_000)
  })

  test('row-level security rejects a write claiming another organization`s id (WITH CHECK)', async () => {
    const attempt = withWorkspaceTransactionOn(db, ORGANIZATION_B, (tx) =>
      tx.execute(
        sql`insert into ai_budgets (organization_id, period, consumed_minor)
            values (${ORGANIZATION_A}, '2026-10', 0)`,
      ),
    )

    await expect(attempt).rejects.toThrow()
  })

  test('without a workspace context, ai_budgets is invisible', async () => {
    const rows = await db.execute(
      sql`select organization_id from ai_budgets where organization_id = ${ORGANIZATION_A}`,
    )
    expect([...rows]).toHaveLength(0)
  })
})

describe('ai_workspace_kill_switches persistence', () => {
  test('absent means not killed', async () => {
    expect(await killSwitchRepository.isWorkspaceKilled(ORGANIZATION_A)).toBe(false)
  })

  test('setWorkspace(true) kills it, setWorkspace(false) restores it - the product keeps working', async () => {
    await killSwitchRepository.setWorkspace(ORGANIZATION_A, true, USER_ID as EntityId)
    expect(await killSwitchRepository.isWorkspaceKilled(ORGANIZATION_A)).toBe(true)

    await killSwitchRepository.setWorkspace(ORGANIZATION_A, false, USER_ID as EntityId)
    expect(await killSwitchRepository.isWorkspaceKilled(ORGANIZATION_A)).toBe(false)
  })

  test('another organization`s kill switch never affects this one', async () => {
    await killSwitchRepository.setWorkspace(ORGANIZATION_B, true, USER_ID as EntityId)
    expect(await killSwitchRepository.isWorkspaceKilled(ORGANIZATION_A)).toBe(false)
  })

  test('row-level security rejects a write claiming another organization`s id (WITH CHECK)', async () => {
    const attempt = withWorkspaceTransactionOn(db, ORGANIZATION_A, (tx) =>
      tx.execute(
        sql`insert into ai_workspace_kill_switches (organization_id, enabled)
            values (${ORGANIZATION_B}, true)
            on conflict (organization_id) do update set enabled = true`,
      ),
    )

    await expect(attempt).rejects.toThrow()
  })

  test('without a workspace context, ai_workspace_kill_switches is invisible', async () => {
    const rows = await db.execute(
      sql`select organization_id from ai_workspace_kill_switches where organization_id = ${ORGANIZATION_B}`,
    )
    expect([...rows]).toHaveLength(0)
  })
})

describe('ai_global_kill_switch persistence', () => {
  test('is not tenant data - readable and writable with no workspace context at all', async () => {
    expect(await killSwitchRepository.isGloballyKilled()).toBe(false)

    await killSwitchRepository.setGlobal(true, USER_ID as EntityId)
    expect(await killSwitchRepository.isGloballyKilled()).toBe(true)

    // Restore it - a single global singleton every other spec's own AI
    // guardrail checks could read - and clear `updatedBy` too: this test's
    // own user id does not outlive this file's `afterAll`.
    await killSwitchRepository.setGlobal(false, null)
    expect(await killSwitchRepository.isGloballyKilled()).toBe(false)
  })
})
