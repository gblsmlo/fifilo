import type { EntityId } from '../../primitives'
import type {
  AccountLookup,
  ActiveAccount,
  ActiveCategory,
  CategoryLookup,
  NewTransactionRecord,
  PersistableLeg,
  TransactionListFilter,
  TransactionListPage,
  TransactionRepository,
  TransactionUpdatePatch,
  UpdateOutcome,
} from '../ports'
import type { Transaction } from '../transaction'

export const createFakeTransactionRepository = (
  seed: Transaction[] = [],
): TransactionRepository & {
  legsByTransactionId: Map<string, PersistableLeg[]>
} => {
  const transactions = new Map(seed.map((transaction) => [transaction.id, transaction]))
  const legsByTransactionId = new Map<string, PersistableLeg[]>()

  return {
    legsByTransactionId,

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
      legsByTransactionId.set(transaction.id, [...record.legs])
      return transaction
    },

    async delete(organizationId, id) {
      const transaction = transactions.get(id)
      if (!transaction || transaction.organizationId !== organizationId) return false
      transactions.delete(id)
      legsByTransactionId.delete(id)
      return true
    },

    async findById(organizationId, id) {
      const transaction = transactions.get(id)
      return transaction && transaction.organizationId === organizationId ? transaction : null
    },

    async list(organizationId, _filter: TransactionListFilter): Promise<TransactionListPage> {
      const items = [...transactions.values()].filter(
        (transaction) => transaction.organizationId === organizationId,
      )
      return { items, nextCursor: null }
    },

    async update(
      organizationId: string,
      id,
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
      legsByTransactionId.set(id, [...patch.legs])
      return updated
    },
  }
}

export const createFakeAccountLookup = (accounts: ActiveAccount[]): AccountLookup => ({
  async findActiveById(_organizationId, id: EntityId) {
    return accounts.find((account) => account.id === id) ?? null
  },
})

export const createFakeCategoryLookup = (categories: ActiveCategory[]): CategoryLookup => ({
  async findActiveById(_organizationId, id: EntityId) {
    return categories.find((category) => category.id === id) ?? null
  },
})
