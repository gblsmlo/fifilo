import { describe, expect, mock, test } from 'bun:test'

import { type IdempotencyRecord, type IdempotencyStore, withIdempotency } from './idempotency'

/**
 * An in-memory stand-in for `idempotency_records`. `begin` mirrors the
 * `insert ... on conflict do nothing` a Drizzle-backed store uses to claim a
 * key atomically: it is the mechanism the "already in progress" cases below
 * exercise, without needing PostgreSQL for logic that owns no SQL.
 */
const createFakeStore = (): IdempotencyStore => {
  const records = new Map<string, IdempotencyRecord>()
  const keyOf = (organizationId: string, key: string) => `${organizationId}:${key}`

  return {
    async begin(organizationId, key, requestHash, _expiresAt) {
      const id = keyOf(organizationId, key)
      if (records.has(id)) return false
      records.set(id, { requestHash, responseBody: null, status: 'pending' })
      return true
    },
    async complete(organizationId, key, responseBody) {
      records.set(keyOf(organizationId, key), {
        requestHash: records.get(keyOf(organizationId, key))?.requestHash ?? '',
        responseBody,
        status: 'completed',
      })
    },
    async find(organizationId, key) {
      return records.get(keyOf(organizationId, key)) ?? null
    },
  }
}

describe('withIdempotency', () => {
  test('executes the effect once and returns its result', async () => {
    const store = createFakeStore()
    const execute = mock(async () => ({ id: 'created_1' }))

    const result = await withIdempotency({
      execute,
      idempotencyKey: 'key-1',
      organizationId: 'org_a',
      requestPayload: { amount: 100 },
      store,
    })

    expect(result).toEqual({ ok: true, value: { id: 'created_1' } })
    expect(execute).toHaveBeenCalledTimes(1)
  })

  test('a repeated key with the same payload replays the stored result without a second effect', async () => {
    const store = createFakeStore()
    const execute = mock(async () => ({ id: 'created_1' }))
    const call = () =>
      withIdempotency({
        execute,
        idempotencyKey: 'key-1',
        organizationId: 'org_a',
        requestPayload: { amount: 100 },
        store,
      })

    const first = await call()
    const second = await call()

    expect(first).toEqual(second)
    expect(execute).toHaveBeenCalledTimes(1)
  })

  test('a repeated key with a different payload is a conflict, not a replay', async () => {
    const store = createFakeStore()
    const execute = mock(async () => ({ id: 'created_1' }))

    await withIdempotency({
      execute,
      idempotencyKey: 'key-1',
      organizationId: 'org_a',
      requestPayload: { amount: 100 },
      store,
    })

    const result = await withIdempotency({
      execute,
      idempotencyKey: 'key-1',
      organizationId: 'org_a',
      requestPayload: { amount: 200 },
      store,
    })

    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error.code).toBe('idempotency_key_reused')
    expect(execute).toHaveBeenCalledTimes(1)
  })

  test('a key still in flight is a conflict, never a second execution', async () => {
    const store = createFakeStore()
    const execute = mock(async () => ({ id: 'created_1' }))

    await store.begin('org_a', 'key-1', 'irrelevant-hash', new Date())

    const result = await withIdempotency({
      execute,
      idempotencyKey: 'key-1',
      organizationId: 'org_a',
      requestPayload: { amount: 100 },
      store,
    })

    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error.code).toBe('idempotency_in_progress')
    expect(execute).not.toHaveBeenCalled()
  })

  test('the same key scoped to a different organization does not collide', async () => {
    const store = createFakeStore()
    const execute = mock(async () => ({ id: 'created_1' }))
    const callFor = (organizationId: string) =>
      withIdempotency({
        execute,
        idempotencyKey: 'key-1',
        organizationId,
        requestPayload: { amount: 100 },
        store,
      })

    await callFor('org_a')
    await callFor('org_b')

    expect(execute).toHaveBeenCalledTimes(2)
  })
})
