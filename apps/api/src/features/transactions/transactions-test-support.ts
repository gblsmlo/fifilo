import type { EntityId } from '@fifilo/core/primitives'
import type {
  AccountLookup,
  ActiveAccount,
  ActiveCategory,
  CategoryLookup,
  NewTransactionRecord,
  PersistableLeg,
  Transaction,
  TransactionListFilter,
  TransactionListPage,
  TransactionRepository,
  TransactionUpdatePatch,
  UpdateOutcome,
} from '@fifilo/core/transactions'

/**
 * An in-memory stand-in for the Drizzle adapter, local to this feature's
 * route tests. Not imported from `@fifilo/core`'s own use-case tests: a deep
 * path into another workspace's `src/` is not an export the package publishes
 * (Decision 001), so this stays a small, separately-owned copy instead.
 */
export const createFakeTransactionRepository = (
  seed: Transaction[] = [],
): TransactionRepository => {
  const transactions = new Map(seed.map((transaction) => [transaction.id, transaction]))

  return {
    async create(record: NewTransactionRecord) {
      const transaction: Transaction = {
        categoryId: record.categoryId,
        createdAt: record.createdAt,
        createdBy: record.createdBy,
        description: record.description,
        id: record.id,
        kind: record.kind,
        legs: record.legs,
        notes: record.notes,
        occurredOn: record.occurredOn,
        organizationId: record.organizationId,
        updatedAt: record.createdAt,
        version: 1,
      }
      transactions.set(transaction.id, transaction)
      return transaction
    },

    async delete(organizationId, id) {
      const transaction = transactions.get(id)
      if (!transaction || transaction.organizationId !== organizationId) return false
      transactions.delete(id)
      return true
    },

    async findById(organizationId, id) {
      const transaction = transactions.get(id)
      return transaction && transaction.organizationId === organizationId ? transaction : null
    },

    async list(organizationId, _filter: TransactionListFilter): Promise<TransactionListPage> {
      const items = [...transactions.values()]
        .filter((transaction) => transaction.organizationId === organizationId)
        .sort((a, b) => b.occurredOn.localeCompare(a.occurredOn) || b.id.localeCompare(a.id))
      return { items, nextCursor: null }
    },

    async update(
      organizationId: string,
      id: EntityId,
      expectedVersion: number,
      patch: TransactionUpdatePatch,
    ): Promise<UpdateOutcome> {
      const transaction = transactions.get(id)
      if (!transaction || transaction.organizationId !== organizationId) return 'not_found'
      if (transaction.version !== expectedVersion) return 'version_conflict'

      const updated: Transaction = {
        ...transaction,
        categoryId: patch.categoryId,
        description: patch.description,
        legs: patch.legs,
        notes: patch.notes,
        occurredOn: patch.occurredOn,
        updatedAt: new Date(),
        version: transaction.version + 1,
      }
      transactions.set(id, updated)
      return updated
    },
  }
}

export const createFakeAccountLookup = (accounts: ActiveAccount[] = []): AccountLookup => ({
  async findActiveById(_organizationId, id) {
    return accounts.find((account) => account.id === id) ?? null
  },
})

export const createFakeCategoryLookup = (categories: ActiveCategory[] = []): CategoryLookup => ({
  async findActiveById(_organizationId, id) {
    return categories.find((category) => category.id === id) ?? null
  },
})

export const seedActiveAccount = (overrides: Partial<ActiveAccount> = {}): ActiveAccount => ({
  archivedAt: null,
  currency: 'BRL',
  id: 'acc_default' as EntityId,
  ...overrides,
})

export const seedActiveCategory = (overrides: Partial<ActiveCategory> = {}): ActiveCategory => ({
  archivedAt: null,
  id: 'cat_default' as EntityId,
  kind: 'expense',
  ...overrides,
})

export const seedTransactionLeg = (overrides: Partial<PersistableLeg> = {}): PersistableLeg => ({
  accountId: 'acc_default' as EntityId,
  amountMinor: -5_000,
  currency: 'BRL',
  id: 'leg_default' as EntityId,
  ...overrides,
})
