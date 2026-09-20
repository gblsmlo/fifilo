import { Stat } from '@fifilo/patterns/stat'
import { Widget, WidgetPanel } from '@fifilo/patterns/widget'
import { formatMoney } from '@libs/format-money'
import { useQuery } from '@tanstack/react-query'
import { Page } from '@web/components/page'
import { AccountList } from '../components/account-list'
import { AccountForm } from '../components/forms/account-form'
import { useArchiveAccount } from '../hooks/use-archive-account'
import { AccountRequestError } from '../http/errors'
import { accountBalancesQueryOptions, accountsQueryOptions } from '../query-options'

export function AccountsPage() {
  const accountsQuery = useQuery(accountsQueryOptions())
  const balancesQuery = useQuery(accountBalancesQueryOptions())
  const archiveAccount = useArchiveAccount()

  return (
    <Page width='lg'>
      <Page.Header
        align='start'
        description='Contas financeiras do workspace e o saldo consolidado de cada uma.'
        title='Contas'
      />

      <Stat
        className='sm:max-w-xs'
        data-testid='consolidated-balance'
        label='Saldo consolidado'
        loading={!balancesQuery.data}
        value={balancesQuery.data ? formatMoney(balancesQuery.data.consolidated) : undefined}
      />

      <div className='grid gap-6 lg:grid-cols-[1fr_320px]'>
        <AccountList
          accounts={accountsQuery.data ?? []}
          balancesByAccountId={
            new Map(
              (balancesQuery.data?.accounts ?? []).map((entry) => [entry.accountId, entry.balance]),
            )
          }
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

        <Widget className='self-start' title='Nova conta'>
          <WidgetPanel>
            <AccountForm />
          </WidgetPanel>
        </Widget>
      </div>
    </Page>
  )
}
