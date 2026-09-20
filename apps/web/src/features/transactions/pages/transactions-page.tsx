import { accountsQueryOptions } from '@features/accounts'
import { categoriesQueryOptions } from '@features/categories'
import { workspaceSettingsQueryOptions } from '@features/settings'
import type { TransactionResponse, TransactionsPageResponse } from '@fifilo/core/transactions'
import { type CollectionDefinition, CollectionProvider } from '@fifilo/patterns/collection-views'
import { useInfiniteQuery, useQuery } from '@tanstack/react-query'
import { Page } from '@web/components/page'
import { useMemo, useState } from 'react'
import { TransactionDialog } from '../components/forms/transaction-dialog'
import { TransactionGrid } from '../components/transaction-grid'
import { TransactionsToolbar } from '../components/transactions-toolbar'
import { useDeleteTransaction } from '../hooks/use-delete-transaction'
import { useUpdateTransaction } from '../hooks/use-update-transaction'
import { TransactionRequestError } from '../http/errors'
import { transactionsQueryOptions } from '../query-options'
import { DEFAULT_WORKSPACE_TIMEZONE, resolveThisMonthRange } from '../resolve-this-month'
import type { TransactionsSearch } from '../route-search'

interface TransactionsPageProps {
  onSearchChange: (next: TransactionsSearch) => void
  search: TransactionsSearch
}

export function TransactionsPage({ onSearchChange, search }: Readonly<TransactionsPageProps>) {
  const [dialogOpen, setDialogOpen] = useState(false)
  const settingsQuery = useQuery(workspaceSettingsQueryOptions())
  const thisMonth = resolveThisMonthRange(
    new Date(),
    settingsQuery.data?.timezone ?? DEFAULT_WORKSPACE_TIMEZONE,
    settingsQuery.data?.monthStartDay ?? 1,
  )
  const from = search.from ?? thisMonth.from
  const to = search.to ?? thisMonth.to

  const accountsQuery = useQuery(accountsQueryOptions())
  const categoriesQuery = useQuery(categoriesQueryOptions())
  const transactionsQuery = useInfiniteQuery(
    transactionsQueryOptions({
      accountId: search.accountId,
      categoryId: search.categoryId,
      from,
      kind: search.kind,
      q: search.q,
      to,
    }),
  )

  const deleteTransaction = useDeleteTransaction()
  const updateTransaction = useUpdateTransaction()

  const accounts = accountsQuery.data ?? []
  const categories = categoriesQuery.data ?? []
  const transactions = useMemo(
    () =>
      transactionsQuery.data?.pages.flatMap((page: TransactionsPageResponse) => page.items) ?? [],
    [transactionsQuery.data],
  )
  const collection = useMemo<CollectionDefinition<TransactionResponse>>(
    () => ({
      getKey: (transaction) => transaction.id,
      getLabel: (transaction) => transaction.description,
      groupings: [],
      items: transactions,
    }),
    [transactions],
  )

  return (
    <Page width='lg'>
      <Page.Header
        align='start'
        description='Receitas, despesas e transferências do workspace no período selecionado.'
        title='Transações'
      />

      <CollectionProvider
        collection={collection}
        defaultPreferences={{ groupBy: null, view: 'datagrid' }}
      >
        <TransactionsToolbar
          accounts={accounts}
          categories={categories}
          from={from}
          onCreate={() => setDialogOpen(true)}
          onSearchChange={onSearchChange}
          search={search}
          to={to}
        />

        <TransactionGrid
          accounts={accounts}
          categories={categories}
          collection={collection}
          error={
            transactionsQuery.isError
              ? {
                  code:
                    transactionsQuery.error instanceof TransactionRequestError
                      ? transactionsQuery.error.code
                      : undefined,
                  message:
                    transactionsQuery.error instanceof TransactionRequestError
                      ? transactionsQuery.error.message
                      : 'Não foi possível carregar as transações.',
                  onRetry: () => transactionsQuery.refetch(),
                }
              : null
          }
          hasNextPage={transactionsQuery.hasNextPage}
          isDeleting={deleteTransaction.isPending}
          isFetchingNextPage={transactionsQuery.isFetchingNextPage}
          isPending={transactionsQuery.isPending}
          onChange={(transaction, change) => updateTransaction.mutate({ change, transaction })}
          onDelete={(id) => deleteTransaction.mutate(id)}
          onLoadMore={() => transactionsQuery.fetchNextPage()}
          transactions={transactions}
        />
      </CollectionProvider>

      <TransactionDialog onOpenChange={setDialogOpen} open={dialogOpen} />
    </Page>
  )
}
