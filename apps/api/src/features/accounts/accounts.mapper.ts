import type {
  Account,
  AccountBalancesResponse,
  AccountBalancesResult,
  AccountResponse,
} from '@fifilo/core/accounts'

export const toAccountResponse = (account: Account): AccountResponse => ({
  archivedAt: account.archivedAt?.toISOString() ?? null,
  color: account.color,
  createdAt: account.createdAt.toISOString(),
  currency: account.currency,
  icon: account.icon,
  id: account.id,
  institution: account.institution,
  kind: account.kind,
  name: account.name,
  organizationId: account.organizationId,
  updatedAt: account.updatedAt.toISOString(),
  version: account.version,
})

export const toAccountBalancesResponse = (
  result: AccountBalancesResult,
): AccountBalancesResponse => ({
  accounts: result.accounts.map((balance) => ({
    accountId: balance.accountId,
    balance: balance.balance,
  })),
  consolidated: result.consolidated,
})
