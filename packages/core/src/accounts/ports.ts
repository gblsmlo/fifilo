import type { EntityId } from '../primitives'
import type { Account, AccountKind } from './account'

export type NewAccountRecord = {
  color: string | null
  createdAt: Date
  createdBy: EntityId
  currency: Account['currency']
  icon: string | null
  id: EntityId
  institution: string | null
  kind: AccountKind
  name: string
  organizationId: string
}

/** The opening-balance movement (Fase 01 § Modelagem): one dated entry, never a column. */
export type OpeningEntryRecord = {
  amountMinor: number
  id: EntityId
  occurredOn: string
}

export type AccountUpdatePatch = Partial<Pick<Account, 'color' | 'icon' | 'institution' | 'name'>>

/** Why a conditional update returned no row: the two causes need different HTTP statuses. */
export type UpdateOutcome = Account | 'not_found' | 'version_conflict'

/**
 * The persistence a use case needs, not the shape of `financial_accounts`
 * (Decision 003). `create` returns `null` for a conflict the database itself
 * caught (a duplicate name) instead of throwing, so the use case maps it the
 * same way it maps its own upfront check — defense in depth, one error type
 * either way.
 */
export type AccountRepository = {
  archive: (organizationId: string, id: EntityId) => Promise<Account | null>
  create: (
    account: NewAccountRecord,
    openingEntry: OpeningEntryRecord | null,
  ) => Promise<Account | null>
  findByName: (organizationId: string, nameKey: string) => Promise<Account | null>
  list: (organizationId: string, options: { includeArchived: boolean }) => Promise<Account[]>
  update: (
    organizationId: string,
    id: EntityId,
    expectedVersion: number,
    patch: AccountUpdatePatch,
  ) => Promise<UpdateOutcome>
}

/** Read-only access to the ledger a balance is computed from. */
export type EntryReader = {
  balancesByAccount: (
    organizationId: string,
    asOf: string,
  ) => Promise<ReadonlyMap<EntityId, number>>
}
