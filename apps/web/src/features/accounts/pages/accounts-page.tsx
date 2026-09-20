import type { AccountResponse } from '@fifilo/core/accounts'
import { type CollectionDefinition, CollectionProvider } from '@fifilo/patterns/collection-views'
import { Dialog } from '@fifilo/patterns/dialog'
import { Stat, StatGroup } from '@fifilo/patterns/stat'
import { Button } from '@fifilo/ui/components/button'
import { formatMoney } from '@libs/format-money'
import { useQuery } from '@tanstack/react-query'
import { Page } from '@web/components/page'
import { useMemo, useState } from 'react'
import { AccountList } from '../components/account-list'
import { AccountForm } from '../components/forms/account-form'
import { useArchiveAccount } from '../hooks/use-archive-account'
import { AccountRequestError } from '../http/errors'
import { accountBalancesQueryOptions, accountsQueryOptions } from '../query-options'

export function AccountsPage() {
  const [creating, setCreating] = useState(false)
  const accountsQuery = useQuery(accountsQueryOptions())
  const balancesQuery = useQuery(accountBalancesQueryOptions())
  const archiveAccount = useArchiveAccount()

  const accounts = accountsQuery.data ?? []
  const balancesByAccountId = useMemo(
    () =>
      new Map(
        (balancesQuery.data?.accounts ?? []).map((entry) => [entry.accountId, entry.balance]),
      ),
    [balancesQuery.data],
  )
  const collection = useMemo<CollectionDefinition<AccountResponse>>(
    () => ({
      getKey: (account) => account.id,
      getLabel: (account) => account.name,
      groupings: [],
      items: accounts,
    }),
    [accounts],
  )

  const activeCount = accounts.filter((account) => !account.archivedAt).length
  const archivedCount = accounts.length - activeCount

  return (
    <Page width='lg'>
      <Page.Header
        actions={
          <Button onClick={() => setCreating(true)} type='button'>
            Nova conta
          </Button>
        }
        align='start'
        description='Contas financeiras do workspace e o saldo consolidado de cada uma.'
        title='Contas'
      />

      <StatGroup columns={3}>
        <Stat
          data-testid='consolidated-balance'
          label='Saldo consolidado'
          loading={!balancesQuery.data}
          value={balancesQuery.data ? formatMoney(balancesQuery.data.consolidated) : undefined}
        />
        <Stat
          hint='Recebem novos lançamentos'
          label='Contas ativas'
          loading={accountsQuery.isPending}
          value={activeCount}
        />
        <Stat
          hint='Mantêm o histórico'
          label='Contas arquivadas'
          loading={accountsQuery.isPending}
          value={archivedCount}
        />
      </StatGroup>

      <CollectionProvider
        collection={collection}
        defaultPreferences={{ groupBy: null, view: 'list' }}
      >
        <AccountList
          accounts={accounts}
          balancesByAccountId={balancesByAccountId}
          collection={collection}
          error={
            accountsQuery.isError
              ? {
                  code:
                    accountsQuery.error instanceof AccountRequestError
                      ? accountsQuery.error.code
                      : undefined,
                  message:
                    accountsQuery.error instanceof AccountRequestError
                      ? accountsQuery.error.message
                      : 'Não foi possível carregar as contas.',
                  onRetry: () => accountsQuery.refetch(),
                }
              : null
          }
          isArchiving={archiveAccount.isPending}
          isPending={accountsQuery.isPending}
          onArchive={(id) => archiveAccount.mutate(id)}
        />
      </CollectionProvider>

      <Dialog
        description='O saldo começa zerado; um lançamento alimenta a conta depois.'
        onOpenChange={setCreating}
        open={creating}
        title='Nova conta'
      >
        <AccountForm onCreated={() => setCreating(false)} />
      </Dialog>
    </Page>
  )
}
