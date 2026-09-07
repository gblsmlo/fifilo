import { afterAll, beforeAll, describe, expect, test } from 'bun:test'
import { type EntityId, generateEntityId } from '@fifilo/core/primitives'
import { db } from '@fifilo/infra-database/client'
import { organizations, users } from '@fifilo/infra-database/schema'
import {
  withActorWorkspaceTransactionOn,
  withWorkspaceTransactionOn,
} from '@fifilo/infra-database/workspace'
import { inArray, sql } from 'drizzle-orm'

import { requirePostgres } from '../../test/require-postgres'
import { createUserPreferencesRepository } from './user-preferences-persistence'
import { createWorkspaceAccountsLookup } from './workspace-accounts-lookup-persistence'
import { createWorkspaceSettingsRepository } from './workspace-settings-persistence'

/**
 * Proves the real adapters against real PostgreSQL: the five negative proofs
 * `tenant-workspace-policy.integration.test.ts` established for
 * `workspace_settings` (a standard organization-scoped policy), plus the
 * extra same-organization-different-user negative proof `user_preferences`
 * needs for its novel `app.user_id`-scoped policy (Fase 06 § Modelagem).
 */
const ORGANIZATION_A = `test_settings_org_a_${generateEntityId()}`
const ORGANIZATION_B = `test_settings_org_b_${generateEntityId()}`
const USER_A = `test_settings_user_a_${generateEntityId()}`
const USER_B = `test_settings_user_b_${generateEntityId()}`

const settingsRepository = createWorkspaceSettingsRepository()
const preferencesRepository = createUserPreferencesRepository()
const accountsLookup = createWorkspaceAccountsLookup()

beforeAll(async () => {
  await requirePostgres()

  await db.insert(organizations).values([
    { id: ORGANIZATION_A, name: 'Test Settings Org A', slug: `${ORGANIZATION_A}-slug` },
    { id: ORGANIZATION_B, name: 'Test Settings Org B', slug: `${ORGANIZATION_B}-slug` },
  ])
  await db.insert(users).values([
    {
      email: `${USER_A}@fifilo.local`,
      emailVerified: true,
      id: USER_A,
      name: 'Test Settings User A',
    },
    {
      email: `${USER_B}@fifilo.local`,
      emailVerified: true,
      id: USER_B,
      name: 'Test Settings User B',
    },
  ])
})

afterAll(async () => {
  await db.delete(organizations).where(inArray(organizations.id, [ORGANIZATION_A, ORGANIZATION_B]))
  await db.delete(users).where(inArray(users.id, [USER_A, USER_B]))
})

describe('workspace settings persistence', () => {
  test('upsert with expectedVersion 0 inserts the singleton row', async () => {
    const created = await settingsRepository.upsert(
      ORGANIZATION_A,
      { timezone: 'America/Bahia' },
      0,
    )
    expect(created).not.toBe('version_conflict')
    if (created === 'version_conflict') throw new Error('unreachable')
    expect(created.timezone).toBe('America/Bahia')
    expect(created.version).toBe(1)
  })

  test('a second insert attempt at version 0 is a conflict, not a silent overwrite', async () => {
    const outcome = await settingsRepository.upsert(
      ORGANIZATION_A,
      { timezone: 'America/Recife' },
      0,
    )
    expect(outcome).toBe('version_conflict')
  })

  test('a stale version is a conflict on update', async () => {
    const found = await settingsRepository.findByOrganizationId(ORGANIZATION_A)
    if (!found) throw new Error('expected the row created above')

    const stale = await settingsRepository.upsert(
      ORGANIZATION_A,
      { timezone: 'America/Recife' },
      found.version,
    )
    expect(stale).not.toBe('version_conflict')

    const conflict = await settingsRepository.upsert(
      ORGANIZATION_A,
      { timezone: 'America/Manaus' },
      found.version,
    )
    expect(conflict).toBe('version_conflict')
  })

  test('another organization cannot find or upsert the first organization`s row', async () => {
    const foundByB = await settingsRepository.findByOrganizationId(ORGANIZATION_B)
    expect(foundByB).toBeNull()

    const outcome = await settingsRepository.upsert(
      ORGANIZATION_B,
      { timezone: 'America/Fortaleza' },
      0,
    )
    expect(outcome).not.toBe('version_conflict')

    const stillIsolated = await settingsRepository.findByOrganizationId(ORGANIZATION_A)
    expect(stillIsolated?.timezone).not.toBe('America/Fortaleza')
  })

  test('row-level security rejects a write claiming another organization`s id (WITH CHECK)', async () => {
    const attempt = withWorkspaceTransactionOn(db, ORGANIZATION_B, (tx) =>
      tx.execute(
        sql`insert into workspace_settings (organization_id, currency, locale, timezone)
            values (${ORGANIZATION_A}, 'BRL', 'pt-BR', 'America/Sao_Paulo')`,
      ),
    )

    await expect(attempt).rejects.toThrow()
  })

  test('without a workspace context, workspace settings are invisible', async () => {
    const rows = await db.execute(
      sql`select organization_id from workspace_settings where organization_id = ${ORGANIZATION_A}`,
    )
    expect([...rows]).toHaveLength(0)
  })

  test('the currency lock consults only the account existence, not the settings row', async () => {
    const hasAny = await accountsLookup.hasAny(ORGANIZATION_A)
    expect(hasAny).toBe(false)
  })
})

describe('user preferences persistence', () => {
  test('upsert with expectedVersion 0 inserts the singleton row for that user', async () => {
    const created = await preferencesRepository.upsert(
      ORGANIZATION_A,
      USER_A as EntityId,
      { theme: 'dark' },
      0,
    )
    expect(created).not.toBe('version_conflict')
    if (created === 'version_conflict') throw new Error('unreachable')
    expect(created.theme).toBe('dark')
    expect(created.version).toBe(1)
  })

  test('a stale version is a conflict on update', async () => {
    const found = await preferencesRepository.findByUser(ORGANIZATION_A, USER_A as EntityId)
    if (!found) throw new Error('expected the row created above')

    const first = await preferencesRepository.upsert(
      ORGANIZATION_A,
      USER_A as EntityId,
      { theme: 'light' },
      found.version,
    )
    expect(first).not.toBe('version_conflict')

    const conflict = await preferencesRepository.upsert(
      ORGANIZATION_A,
      USER_A as EntityId,
      { theme: 'system' },
      found.version,
    )
    expect(conflict).toBe('version_conflict')
  })

  /**
   * The novel proof this table needs beyond the standard five: the RLS
   * policy filters on `app.user_id` too, so a second user in the SAME
   * organization must not see or overwrite the first user's row - a
   * cross-organization leak alone would not catch this.
   */
  test('same organization, different user: preferences are invisible and cannot be upserted over', async () => {
    const foundByOtherUser = await preferencesRepository.findByUser(
      ORGANIZATION_A,
      USER_B as EntityId,
    )
    expect(foundByOtherUser).toBeNull()

    const outcome = await preferencesRepository.upsert(
      ORGANIZATION_A,
      USER_B as EntityId,
      { theme: 'dark' },
      0,
    )
    expect(outcome).not.toBe('version_conflict')

    const userAsRowUnaffected = await preferencesRepository.findByUser(
      ORGANIZATION_A,
      USER_A as EntityId,
    )
    expect(userAsRowUnaffected?.theme).not.toBe('dark')
  })

  test('another organization cannot find the first organization`s preferences for the same user id', async () => {
    const foundByOrgB = await preferencesRepository.findByUser(ORGANIZATION_B, USER_A as EntityId)
    expect(foundByOrgB).toBeNull()
  })

  test('row-level security rejects a write claiming another user`s id (WITH CHECK)', async () => {
    const attempt = withActorWorkspaceTransactionOn(db, ORGANIZATION_A, USER_A, (tx) =>
      tx.execute(
        sql`insert into user_preferences (organization_id, user_id, theme, density, notify_by_email)
            values (${ORGANIZATION_A}, ${USER_B}, 'dark', 'comfortable', true)`,
      ),
    )

    await expect(attempt).rejects.toThrow()
  })

  test('without an actor context, user preferences are invisible even with a workspace context', async () => {
    const rows = await withWorkspaceTransactionOn(db, ORGANIZATION_A, (tx) =>
      tx.execute(
        sql`select user_id from user_preferences where organization_id = ${ORGANIZATION_A}`,
      ),
    )
    expect([...rows]).toHaveLength(0)
  })
})
