import { isUniqueViolation } from '@fifilo/infra-database/postgres-errors'
import { idempotencyRecords } from '@fifilo/infra-database/schema'
import { withWorkspaceTransaction } from '@fifilo/infra-database/workspace'
import { and, eq, sql } from 'drizzle-orm'

import type { IdempotencyRecord, IdempotencyStore } from './idempotency'

/**
 * The Drizzle adapter for `idempotency_records`. `begin` is
 * `insert ... on conflict do nothing`'s hand-rolled equivalent: the unique
 * violation on the primary key is what makes two concurrent requests racing
 * the same key agree on exactly one winner.
 */
export const createDrizzleIdempotencyStore = (): IdempotencyStore => ({
  async begin(organizationId, key, requestHash, expiresAt) {
    try {
      await withWorkspaceTransaction(organizationId, (tx) =>
        tx.insert(idempotencyRecords).values({
          expiresAt,
          key,
          organizationId,
          requestHash,
          responseBody: null,
          status: 'pending',
        }),
      )
      return true
    } catch (error) {
      if (isUniqueViolation(error)) return false
      throw error
    }
  },

  async complete(organizationId, key, responseBody) {
    await withWorkspaceTransaction(organizationId, (tx) =>
      tx
        .update(idempotencyRecords)
        .set({ responseBody, status: 'completed', updatedAt: sql`now()` })
        .where(
          and(
            eq(idempotencyRecords.organizationId, organizationId),
            eq(idempotencyRecords.key, key),
          ),
        ),
    )
  },

  async find(organizationId, key): Promise<IdempotencyRecord | null> {
    return withWorkspaceTransaction(organizationId, async (tx) => {
      const [row] = await tx
        .select()
        .from(idempotencyRecords)
        .where(
          and(
            eq(idempotencyRecords.organizationId, organizationId),
            eq(idempotencyRecords.key, key),
          ),
        )
        .limit(1)

      if (!row) return null

      return {
        requestHash: row.requestHash,
        responseBody: row.responseBody,
        status: row.status as IdempotencyRecord['status'],
      }
    })
  },

  async release(organizationId, key) {
    await withWorkspaceTransaction(organizationId, (tx) =>
      tx
        .delete(idempotencyRecords)
        .where(
          and(
            eq(idempotencyRecords.organizationId, organizationId),
            eq(idempotencyRecords.key, key),
          ),
        ),
    )
  },
})
