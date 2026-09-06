import { afterAll, beforeAll, describe, expect, test } from 'bun:test'
import { migrationEnv } from '@fifilo/infra-env/migration'
import { sql } from 'drizzle-orm'
import { drizzle } from 'drizzle-orm/bun-sql'

import { db } from '../client'
import { tenantWorkspacePolicyDdl } from '../tenant-policy'
import { requirePostgres } from '../test/require-postgres'
import { applyWorkspaceContext, withWorkspaceTransactionOn } from '../workspace'

/**
 * Proves the recipe in `tenant-policy.ts` against real PostgreSQL, before any
 * business table exists to carry it (Fase 00). The table is a fixture created
 * and dropped by this suite alone: it is never declared in `schema.ts` and
 * never ships in `drizzle/`. Fase 01's `financial_accounts` is what applies
 * this recipe for keeps.
 *
 * `db` (imported from `../client`) connects as the restricted runtime role
 * `DATABASE_URL` names, exactly like the application does — it is the
 * connection every proof below queries through. Creating and dropping the
 * fixture needs schema ownership that role must not have, so setup and
 * teardown use a second connection on the migration role instead.
 */
const owner = drizzle({ connection: migrationEnv.DATABASE_MIGRATION_URL })

const FIXTURE_TABLE = 'rls_fixture_accounts'

const ORGANIZATION_A = 'rls_fixture_org_a'
const ORGANIZATION_B = 'rls_fixture_org_b'

beforeAll(async () => {
  await requirePostgres()

  await owner.execute(
    sql.raw(`
      create table "${FIXTURE_TABLE}" (
        "organization_id" text not null,
        "id" text not null,
        "value" text not null,
        primary key ("organization_id", "id")
      )
    `),
  )

  for (const statement of tenantWorkspacePolicyDdl(FIXTURE_TABLE)) {
    await owner.execute(sql.raw(statement))
  }

  // No explicit grant to the runtime role here: `bun run db:bootstrap-roles`
  // already set `ALTER DEFAULT PRIVILEGES` for the migration role, so every
  // table it creates from that point on — this fixture included — grants the
  // runtime role CRUD automatically, the same way a real migration would.
})

afterAll(async () => {
  await owner.execute(sql.raw(`drop table if exists "${FIXTURE_TABLE}"`))
  await owner.$client.end()
})

describe('tenant workspace policy', () => {
  test('an organization writes and reads its own row', async () => {
    const row = await withWorkspaceTransactionOn(db, ORGANIZATION_A, async (tx) => {
      await tx.execute(
        sql`insert into ${sql.identifier(FIXTURE_TABLE)} (organization_id, id, value)
            values (${ORGANIZATION_A}, 'row_1', 'a-owns-this')`,
      )

      return tx.execute(sql`select value from ${sql.identifier(FIXTURE_TABLE)} where id = 'row_1'`)
    })

    expect([...row]).toEqual([{ value: 'a-owns-this' }])
  })

  test('a different organization does not see the row', async () => {
    const rows = await withWorkspaceTransactionOn(db, ORGANIZATION_B, (tx) =>
      tx.execute(sql`select value from ${sql.identifier(FIXTURE_TABLE)} where id = 'row_1'`),
    )

    expect([...rows]).toHaveLength(0)
  })

  test('a different organization cannot write a row carrying the first organization`s id', async () => {
    const attempt = withWorkspaceTransactionOn(db, ORGANIZATION_B, (tx) =>
      tx.execute(
        sql`insert into ${sql.identifier(FIXTURE_TABLE)} (organization_id, id, value)
            values (${ORGANIZATION_A}, 'row_2', 'planted-by-b')`,
      ),
    )

    await expect(attempt).rejects.toThrow()

    const planted = await withWorkspaceTransactionOn(db, ORGANIZATION_A, (tx) =>
      tx.execute(sql`select value from ${sql.identifier(FIXTURE_TABLE)} where id = 'row_2'`),
    )
    expect([...planted]).toHaveLength(0)
  })

  test('without a workspace context, the read returns zero rows', async () => {
    const rows = await db.execute(
      sql`select value from ${sql.identifier(FIXTURE_TABLE)} where id = 'row_1'`,
    )

    expect([...rows]).toHaveLength(0)
  })

  test('an error mid-transaction rolls back the row and the context does not survive it', async () => {
    const failure = db.transaction(async (tx) => {
      await applyWorkspaceContext(tx, ORGANIZATION_A)
      await tx.execute(
        sql`insert into ${sql.identifier(FIXTURE_TABLE)} (organization_id, id, value)
            values (${ORGANIZATION_A}, 'row_3', 'should-not-survive')`,
      )
      throw new Error('forced rollback')
    })

    await expect(failure).rejects.toThrow('forced rollback')

    const afterRollback = await db.execute(
      sql`select value from ${sql.identifier(FIXTURE_TABLE)} where id = 'row_3'`,
    )
    expect([...afterRollback]).toHaveLength(0)

    // `nullif(..., '')` mirrors the policy condition itself: a transaction-scoped
    // `set_config` that never survived past its rollback reverts a custom GUC to
    // '', not SQL NULL, and the policy already treats the two as the same "no
    // tenant" state.
    const contextAfterRollback = await db.execute(
      sql`select nullif(current_setting('app.workspace_id', true), '') as workspace_id`,
    )
    expect([...contextAfterRollback]).toEqual([{ workspace_id: null }])
  })
})
