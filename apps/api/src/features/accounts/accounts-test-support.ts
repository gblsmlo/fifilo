import type {
  Account,
  AccountRepository,
  AccountUpdatePatch,
  EntryReader,
  NewAccountRecord,
  OpeningEntryRecord,
  UpdateOutcome,
} from '@fifilo/core/accounts'
import type { EntityId } from '@fifilo/core/primitives'

/**
 * An in-memory stand-in for the Drizzle adapter, local to this feature's
 * route tests. Not imported from `@fifilo/core`'s own use-case tests: a deep
 * path into another workspace's `src/` is not an export the package publishes
 * (Decision 001), so this stays a small, separately-owned copy instead.
 */
export const createFakeAccountRepository = (seed: Account[] = []): AccountRepository => {
  const accounts = new Map(seed.map((account) => [account.id, account]))

  const findByNameKey = (organizationId: string, nameKey: string): Account | null =>
    [...accounts.values()].find(
      (account) =>
        account.organizationId === organizationId &&
        !account.archivedAt &&
        account.name.trim().toLowerCase() === nameKey,
    ) ?? null

  return {
    async archive(organizationId, id) {
      const account = accounts.get(id)
      if (!account || account.organizationId !== organizationId) return null
      const archived: Account = { ...account, archivedAt: new Date(), version: account.version + 1 }
      accounts.set(id, archived)
      return archived
    },

    async create(record: NewAccountRecord, _openingEntry: OpeningEntryRecord | null) {
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
      id: EntityId,
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
