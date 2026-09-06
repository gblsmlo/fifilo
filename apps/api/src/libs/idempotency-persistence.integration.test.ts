import { afterAll, beforeAll, describe, expect, test } from 'bun:test'
import { generateEntityId } from '@fifilo/core/primitives'
import { db } from '@fifilo/infra-database/client'
import { organizations } from '@fifilo/infra-database/schema'
import { withWorkspaceTransactionOn } from '@fifilo/infra-database/workspace'
import { inArray, sql } from 'drizzle-orm'

import { requirePostgres } from '../test/require-postgres'
import { createDrizzleIdempotencyStore } from './idempotency-persistence'

const ORGANIZATION_A = `test_idempotency_org_a_${generateEntityId()}`
const ORGANIZATION_B = `test_idempotency_org_b_${generateEntityId()}`

const store = createDrizzleIdempotencyStore()

beforeAll(async () => {
  await requirePostgres()

  await db.insert(organizations).values([
    { id: ORGANIZATION_A, name: 'Test Idempotency Org A', slug: `${ORGANIZATION_A}-slug` },
    { id: ORGANIZATION_B, name: 'Test Idempotency Org B', slug: `${ORGANIZATION_B}-slug` },
  ])
})

afterAll(async () => {
  await db.delete(organizations).where(inArray(organizations.id, [ORGANIZATION_A, ORGANIZATION_B]))
})

describe('idempotency_records persistence', () => {
  test('begin claims the key once; a second begin with the same key fails', async () => {
    const key = generateEntityId()
    const expiresAt = new Date(Date.now() + 60_000)

    const first = await store.begin(ORGANIZATION_A, key, 'hash-1', expiresAt)
    const second = await store.begin(ORGANIZATION_A, key, 'hash-1', expiresAt)

    expect(first).toBe(true)
    expect(second).toBe(false)
  })

  test('complete stores the response; find replays it', async () => {
    const key = generateEntityId()
    await store.begin(ORGANIZATION_A, key, 'hash-1', new Date(Date.now() + 60_000))

    await store.complete(ORGANIZATION_A, key, { id: 'created_1' })

    const found = await store.find(ORGANIZATION_A, key)
    expect(found).toEqual({
      requestHash: 'hash-1',
      responseBody: { id: 'created_1' },
      status: 'completed',
    })
  })

  test('release removes the claim, letting a fresh begin succeed', async () => {
    const key = generateEntityId()
    await store.begin(ORGANIZATION_A, key, 'hash-1', new Date(Date.now() + 60_000))

    await store.release(ORGANIZATION_A, key)

    const retried = await store.begin(ORGANIZATION_A, key, 'hash-2', new Date(Date.now() + 60_000))
    expect(retried).toBe(true)
  })

  test('a different organization does not see the first organization`s key', async () => {
    const key = generateEntityId()
    await store.begin(ORGANIZATION_A, key, 'hash-1', new Date(Date.now() + 60_000))

    const foundByB = await store.find(ORGANIZATION_B, key)
    expect(foundByB).toBeNull()

    const claimedByB = await store.begin(
      ORGANIZATION_B,
      key,
      'hash-1',
      new Date(Date.now() + 60_000),
    )
    expect(claimedByB).toBe(true)
  })

  test('row-level security rejects a write claiming another organization`s id (WITH CHECK)', async () => {
    const key = generateEntityId()

    const attempt = withWorkspaceTransactionOn(db, ORGANIZATION_B, (tx) =>
      tx.execute(
        sql`insert into idempotency_records (organization_id, key, request_hash, status, expires_at)
            values (${ORGANIZATION_A}, ${key}, 'hash-1', 'pending', now() + interval '1 hour')`,
      ),
    )

    await expect(attempt).rejects.toThrow()
  })

  test('without a workspace context, idempotency_records is invisible', async () => {
    const key = generateEntityId()
    await store.begin(ORGANIZATION_A, key, 'hash-1', new Date(Date.now() + 60_000))

    const rows = await db.execute(sql`select key from idempotency_records where key = ${key}`)
    expect([...rows]).toHaveLength(0)
  })
})
