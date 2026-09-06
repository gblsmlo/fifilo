import { type DomainError, validationError } from '../../errors'
import { type Money, money } from '../../primitives'
import { type Result, err, ok } from '../../result'
import { DEFAULT_WORKSPACE_CURRENCY } from '../account'
import type { AccountBalance } from '../balance'
import { consolidateBalances } from '../balance'
import type { AccountRepository, EntryReader } from '../ports'

export type GetBalancesQuery = {
  asOf: string
  organizationId: string
}

export type AccountBalancesResult = {
  accounts: AccountBalance[]
  consolidated: Money
}

export type GetBalancesError = DomainError<'validation', 'balance_out_of_range'>

/**
 * Every account carries its own balance because a future currency can differ
 * per account (Fase 01 § Persistência); consolidation sums them under the
 * shared workspace currency the moment two or more exist, and reports zero in
 * it when there are none to sum.
 */
export const getBalances = async (
  query: GetBalancesQuery,
  repository: AccountRepository,
  entries: EntryReader,
): Promise<Result<AccountBalancesResult, GetBalancesError>> => {
  const accounts = await repository.list(query.organizationId, { includeArchived: true })
  const sums = await entries.balancesByAccount(query.organizationId, query.asOf)

  const balances: AccountBalance[] = []

  for (const account of accounts) {
    const balance = money(sums.get(account.id) ?? 0, account.currency)

    if (!balance.ok) {
      return err(
        validationError('balance_out_of_range', 'A balance exceeds the safe integer range.'),
      )
    }

    balances.push({ accountId: account.id, balance: balance.value })
  }

  const consolidated = consolidateBalances(
    balances.map((balance) => balance.balance),
    DEFAULT_WORKSPACE_CURRENCY,
  )

  if (!consolidated.ok) {
    return err(
      validationError('balance_out_of_range', 'The consolidated balance overflowed its range.'),
    )
  }

  return ok({ accounts: balances, consolidated: consolidated.value })
}
