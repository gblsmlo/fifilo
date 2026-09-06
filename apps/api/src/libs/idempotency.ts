import { type DomainError, conflictError } from '@fifilo/core/errors'
import { type Result, err, ok } from '@fifilo/core/result'

/**
 * The stored outcome of a completed attempt, replayed instead of re-run.
 */
export type IdempotencyRecord = {
  requestHash: string
  responseBody: unknown
  status: 'completed' | 'pending'
}

/**
 * The persistence a real command wires in (`idempotency_records`, Fase 00 §
 * Persistência: `(organization_id, key)` unique, `request_hash`,
 * `response_body`, `status`, `expires_at`). No Drizzle-backed implementation
 * ships yet — nothing in this repository calls an external effect that needs
 * one — so this stays a port an in-memory fake satisfies for the envelope's
 * own test, the same way the RLS proof in `packages/infra/database` exercises
 * its recipe against a fixture instead of a table no route reads yet.
 */
export type IdempotencyStore = {
  /** Atomically claims the key for a new attempt; `false` if it already exists. */
  begin: (
    organizationId: string,
    key: string,
    requestHash: string,
    expiresAt: Date,
  ) => Promise<boolean>
  complete: (organizationId: string, key: string, responseBody: unknown) => Promise<void>
  find: (organizationId: string, key: string) => Promise<IdempotencyRecord | null>
  /**
   * Releases a claim `execute()` never completed. Without this, a command
   * that throws — a validation failure, a dependency outage — leaves the key
   * `pending` forever: every retry, including one with corrected input, reads
   * back "still in progress" and never gets a second attempt.
   */
  release: (organizationId: string, key: string) => Promise<void>
}

export type IdempotencyConflictError = DomainError<
  'conflict',
  'idempotency_in_progress' | 'idempotency_key_reused'
>

export type WithIdempotencyInput<TResponse> = {
  execute: () => Promise<TResponse>
  idempotencyKey: string
  organizationId: string
  requestPayload: unknown
  store: IdempotencyStore
}

/** Security.md's 90-day retention row for idempotency records. */
const IDEMPOTENCY_RETENTION_MS = 90 * 24 * 60 * 60 * 1000

const hashPayload = (payload: unknown): string => {
  const hasher = new Bun.CryptoHasher('sha256')
  hasher.update(JSON.stringify(payload))
  return hasher.digest('hex')
}

/**
 * The envelope a command route with an external effect wraps its handler in
 * (operation.md § `idempotency_key` on commands). The same key returns the
 * stored result and never re-executes; the key reused with a different
 * payload, or seen while still in flight, is a conflict — never a silent
 * replay of the wrong response.
 */
export const withIdempotency = async <TResponse>({
  execute,
  idempotencyKey,
  organizationId,
  requestPayload,
  store,
}: WithIdempotencyInput<TResponse>): Promise<Result<TResponse, IdempotencyConflictError>> => {
  const requestHash = hashPayload(requestPayload)
  const expiresAt = new Date(Date.now() + IDEMPOTENCY_RETENTION_MS)

  const claimed = await store.begin(organizationId, idempotencyKey, requestHash, expiresAt)

  if (claimed) {
    try {
      const responseBody = await execute()
      await store.complete(organizationId, idempotencyKey, responseBody)
      return ok(responseBody)
    } catch (error) {
      // The claim never resolved into a response worth replaying; releasing
      // it is what makes the key usable again, corrected input included.
      await store.release(organizationId, idempotencyKey)
      throw error
    }
  }

  const existing = await store.find(organizationId, idempotencyKey)

  if (!existing) {
    return err(
      conflictError('idempotency_in_progress', 'This idempotency key is already being processed.'),
    )
  }

  // Checked before the hash: a still-in-flight attempt is reported as exactly
  // that, whether or not the racing request happens to carry the same
  // payload. Mismatch only becomes the relevant fact once an attempt is known
  // to have actually completed with a specific, verified response.
  if (existing.status === 'pending') {
    return err(
      conflictError('idempotency_in_progress', 'This idempotency key is already being processed.'),
    )
  }

  if (existing.requestHash !== requestHash) {
    return err(
      conflictError(
        'idempotency_key_reused',
        'This idempotency key was already used with a different request.',
      ),
    )
  }

  return ok(existing.responseBody as TResponse)
}
