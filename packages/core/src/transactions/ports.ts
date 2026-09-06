import type { CategoryKind } from '../categories'
import type { CurrencyCode, EntityId } from '../primitives'
import type { Transaction, TransactionKind, TransactionLeg } from './transaction'

/** A leg ready to persist: the account's own currency, looked up once by the use case, travels with it so the adapter never re-queries for it. */
export type PersistableLeg = TransactionLeg & { currency: CurrencyCode; id: EntityId }

export type NewTransactionRecord = {
  categoryId: EntityId | null
  createdAt: Date
  createdBy: EntityId
  description: string
  id: EntityId
  kind: TransactionKind
  legs: ReadonlyArray<PersistableLeg>
  notes: string | null
  occurredOn: string
  organizationId: string
}

export type TransactionUpdatePatch = {
  categoryId: EntityId | null
  description: string
  legs: ReadonlyArray<PersistableLeg>
  notes: string | null
  occurredOn: string
}

export type UpdateOutcome = Transaction | 'not_found' | 'version_conflict'

export type TransactionListFilter = {
  accountId?: EntityId
  categoryId?: EntityId
  cursor?: { id: EntityId; occurredOn: string }
  from?: string
  kind?: TransactionKind
  limit: number
  q?: string
  to?: string
}

export type TransactionListPage = {
  items: Transaction[]
  nextCursor: { id: EntityId; occurredOn: string } | null
}

/**
 * The persistence a use case needs, not the shape of `transactions`
 * (Decision 003). `create` and `update` write the transaction row and its
 * legs atomically, in the same call, so the adapter owns the single
 * transaction they share (Fase 02 § Riscos: rewriting one leg of a transfer
 * and not the other leaves the balance wrong, silently).
 */
export type TransactionRepository = {
  create: (record: NewTransactionRecord) => Promise<Transaction>
  delete: (organizationId: string, id: EntityId) => Promise<boolean>
  findById: (organizationId: string, id: EntityId) => Promise<Transaction | null>
  list: (organizationId: string, filter: TransactionListFilter) => Promise<TransactionListPage>
  update: (
    organizationId: string,
    id: EntityId,
    expectedVersion: number,
    patch: TransactionUpdatePatch,
  ) => Promise<UpdateOutcome>
}

export type ActiveAccount = {
  archivedAt: Date | null
  currency: CurrencyCode
  id: EntityId
}

/** The minimal read the transaction use cases need from accounts — not the full `AccountRepository` (Decision 003). */
export type AccountLookup = {
  findActiveById: (organizationId: string, id: EntityId) => Promise<ActiveAccount | null>
}

export type ActiveCategory = {
  archivedAt: Date | null
  id: EntityId
  kind: CategoryKind
}

/** The minimal read the transaction use cases need from categories. */
export type CategoryLookup = {
  findActiveById: (organizationId: string, id: EntityId) => Promise<ActiveCategory | null>
}
