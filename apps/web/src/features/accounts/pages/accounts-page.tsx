import { Card, CardContent, CardHeader, CardTitle } from '@fifilo/ui/components/card'
import { Spinner } from '@fifilo/ui/components/spinner'
import { useQuery } from '@tanstack/react-query'

import { AccountList } from '../components/account-list'
import { AccountForm } from '../components/forms/account-form'
import { formatMoney } from '../format-money'
import { useArchiveAccount } from '../hooks/use-archive-account'
import { AccountRequestError } from '../http/errors'
import { accountBalancesQueryOptions, accountsQueryOptions } from '../query-options'

export function AccountsPage() {
  const accountsQuery = useQuery(accountsQueryOptions())
  const balancesQuery = useQuery(accountBalancesQueryOptions())
  const archiveAccount = useArchiveAccount()

  return (
    <section className='mx-auto flex w-full max-w-5xl flex-col gap-6 p-6'>
      <div className='space-y-2'>
        <h1 className='font-semibold text-3xl tracking-tight'>Contas</h1>
        <p className='text-muted-foreground'>
          Contas financeiras do workspace e o saldo consolidado de cada uma.
        </p>
        {balancesQuery.data ? (
          <p className='font-medium text-sm' data-testid='consolidated-balance'>
            Saldo consolidado: {formatMoney(balancesQuery.data.consolidated)}
          </p>
        ) : null}
      </div>

      <div className='grid gap-6 lg:grid-cols-[1fr_320px]'>
        <div>
          {accountsQuery.isPending ? (
            <div className='flex justify-center py-12'>
              <Spinner aria-label='Carregando contas' />
            </div>
          ) : null}

          {!accountsQuery.isPending ? (
            <AccountList
              accounts={accountsQuery.data ?? []}
              balancesByAccountId={
                new Map(
                  (balancesQuery.data?.accounts ?? []).map((entry) => [
                    entry.accountId,
                    entry.balance,
                  ]),
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
              onArchive={(id) => archiveAccount.mutate(id)}
            />
          ) : null}
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Nova conta</CardTitle>
          </CardHeader>
          <CardContent>
            <AccountForm />
          </CardContent>
        </Card>
      </div>
    </section>
  )
}
