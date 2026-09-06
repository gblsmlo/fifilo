import type { EntityId } from '../../primitives'
import type { Account } from '../account'
import type {
  AccountRepository,
  AccountUpdatePatch,
  EntryReader,
  NewAccountRecord,
  OpeningEntryRecord,
  UpdateOutcome,
} from '../ports'

/**
 * An in-memory stand-in for the Drizzle adapter, shared by every use-case
 * test in this folder. It mirrors the invariants the real adapter's tenant
 * index and `version` `where` clause enforce (Fase 01 § Riscos), not just the
 * happy path, so a use-case test exercises the same contract the persistence
 * layer will.
 */
export const createFakeAccountRepository = (
  seed: Account[] = [],
): AccountRepository & { entriesByAccount: Map<string, OpeningEntryRecord[]> } => {
  const accounts = new Map(seed.map((account) => [account.id, account]))
  const entriesByAccount = new Map<string, OpeningEntryRecord[]>()

  const findByNameKey = (organizationId: string, nameKey: string): Account | null =>
    [...accounts.values()].find(
      (account) =>
        account.organizationId === organizationId &&
        !account.archivedAt &&
        account.name.trim().toLowerCase() === nameKey,
    ) ?? null

  return {
    entriesByAccount,

    async archive(organizationId, id) {
      const account = accounts.get(id)
      if (!account || account.organizationId !== organizationId) return null

      const archived: Account = { ...account, archivedAt: new Date(), version: account.version + 1 }
      accounts.set(id, archived)
      return archived
    },

    async create(record: NewAccountRecord, openingEntry: OpeningEntryRecord | null) {
      if (findByNameKey(record.organizationId, record.name.trim().toLowerCase())) return null

      const account: Account = {
        archivedAt: null,
        color: record.color,
        createdAt: record.createdAt,
        createdBy: record.createdBy,
        currency: record.currency,
        icon: record.icon,
        id: record.id,
        institution: record.institution,
        kind: record.kind,
        name: record.name,
        organizationId: record.organizationId,
        updatedAt: record.createdAt,
        version: 1,
      }

      accounts.set(account.id, account)
      if (openingEntry) entriesByAccount.set(account.id, [openingEntry])
      return account
    },

    async findByName(organizationId, nameKey) {
      return findByNameKey(organizationId, nameKey)
    },

    async list(organizationId, options) {
      return [...accounts.values()].filter(
        (account) =>
          account.organizationId === organizationId &&
          (options.includeArchived || !account.archivedAt),
      )
    },

    async update(
      organizationId: string,
      id,
      expectedVersion: number,
      patch: AccountUpdatePatch,
    ): Promise<UpdateOutcome> {
      const account = accounts.get(id)
      if (!account || account.organizationId !== organizationId) return 'not_found'
      if (account.version !== expectedVersion) return 'version_conflict'

      const updated: Account = {
        ...account,
        ...patch,
        updatedAt: new Date(),
        version: account.version + 1,
      }
      accounts.set(id, updated)
      return updated
    },
  }
}

export const createFakeEntryReader = (
  balancesByOrganization: Record<string, Record<string, number>> = {},
): EntryReader => ({
  async balancesByAccount(organizationId) {
    const entries = Object.entries(balancesByOrganization[organizationId] ?? {}) as Array<
      [EntityId, number]
    >
    return new Map(entries)
  },
})
