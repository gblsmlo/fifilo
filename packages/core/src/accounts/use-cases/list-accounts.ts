import type { Account } from '../account'
import type { AccountRepository } from '../ports'

export type ListAccountsQuery = {
  includeArchived: boolean
  organizationId: string
}

export const listAccounts = (
  query: ListAccountsQuery,
  repository: AccountRepository,
): Promise<Account[]> =>
  repository.list(query.organizationId, { includeArchived: query.includeArchived })
