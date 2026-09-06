import type { EntityId } from '../../primitives'
import type { TransactionListFilter, TransactionListPage, TransactionRepository } from '../ports'
import type { TransactionKind } from '../transaction'

export type ListTransactionsQuery = {
  accountId?: EntityId
  categoryId?: EntityId
  cursor?: { id: EntityId; occurredOn: string }
  from?: string
  kind?: TransactionKind
  limit: number
  organizationId: string
  q?: string
  to?: string
}

export const listTransactions = (
  query: ListTransactionsQuery,
  repository: TransactionRepository,
): Promise<TransactionListPage> => {
  const filter: TransactionListFilter = { limit: query.limit }
  if (query.accountId) filter.accountId = query.accountId
  if (query.categoryId) filter.categoryId = query.categoryId
  if (query.cursor) filter.cursor = query.cursor
  if (query.from) filter.from = query.from
  if (query.kind) filter.kind = query.kind
  if (query.q) filter.q = query.q
  if (query.to) filter.to = query.to

  return repository.list(query.organizationId, filter)
}
