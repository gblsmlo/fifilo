import { accountsQueryOptions } from '@features/accounts'
import { categoriesQueryOptions } from '@features/categories'
import type { TransactionsPageResponse } from '@fifilo/core/transactions'
import { Button } from '@fifilo/ui/components/button'
import { Spinner } from '@fifilo/ui/components/spinner'
import { useInfiniteQuery, useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { TransactionDialog } from '../components/forms/transaction-dialog'
import { TransactionList } from '../components/transaction-list'
import { useDeleteTransaction } from '../hooks/use-delete-transaction'
import { TransactionRequestError } from '../http/errors'
import { transactionsQueryOptions } from '../query-options'
import { resolveThisMonthRange } from '../resolve-this-month'
import type { TransactionsSearch } from '../route-search'

const selectClassName =
  'h-9 rounded-md border border-input bg-transparent px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50'

const KIND_OPTIONS = [
  { label: 'Todos os tipos', value: '' },
  { label: 'Despesa', value: 'expense' },
  { label: 'Receita', value: 'income' },
  { label: 'Transferência', value: 'transfer' },
] as const

interface TransactionsPageProps {
  onSearchChange: (next: TransactionsSearch) => void
  search: TransactionsSearch
}

export function TransactionsPage({ onSearchChange, search }: Readonly<TransactionsPageProps>) {
  const [dialogOpen, setDialogOpen] = useState(false)
  const thisMonth = resolveThisMonthRange()
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

  const accountNamesById = new Map(
    (accountsQuery.data ?? []).map((account) => [account.id, account.name]),
  )
  const categoryNamesById = new Map(
    (categoriesQuery.data ?? []).map((category) => [category.id, category.name]),
  )

  return (
    <section className='mx-auto flex w-full max-w-5xl flex-col gap-6 p-6'>
      <div className='flex items-start justify-between gap-4'>
        <div className='space-y-2'>
          <h1 className='font-semibold text-3xl tracking-tight'>Transações</h1>
          <p className='text-muted-foreground'>
            Receitas, despesas e transferências do workspace no período selecionado.
          </p>
        </div>
        <Button onClick={() => setDialogOpen(true)} type='button'>
          Nova transação
        </Button>
      </div>

      <form className='flex flex-wrap items-end gap-3' onSubmit={(event) => event.preventDefault()}>
        <label className='flex flex-col gap-1 text-sm'>
          De
          <input
            className={selectClassName}
            onChange={(event) =>
              onSearchChange({ ...search, from: event.target.value || undefined })
            }
            type='date'
            value={from}
          />
        </label>
        <label className='flex flex-col gap-1 text-sm'>
          Até
          <input
            className={selectClassName}
            onChange={(event) => onSearchChange({ ...search, to: event.target.value || undefined })}
            type='date'
            value={to}
          />
        </label>
        <label className='flex flex-col gap-1 text-sm'>
          Tipo
          <select
            className={selectClassName}
            onChange={(event) =>
              onSearchChange({
                ...search,
                kind: (event.target.value || undefined) as TransactionsSearch['kind'],
              })
            }
            value={search.kind ?? ''}
          >
            {KIND_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      </form>

      {transactionsQuery.isPending ? (
        <div className='flex justify-center py-12'>
          <Spinner aria-label='Carregando transações' />
        </div>
      ) : null}

      {!transactionsQuery.isPending ? (
        <TransactionList
          accountNamesById={accountNamesById}
          categoryNamesById={categoryNamesById}
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
          onDelete={(id) => deleteTransaction.mutate(id)}
          onLoadMore={() => transactionsQuery.fetchNextPage()}
          transactions={
            transactionsQuery.data?.pages.flatMap((page: TransactionsPageResponse) => page.items) ??
            []
          }
        />
      ) : null}

      <TransactionDialog onOpenChange={setDialogOpen} open={dialogOpen} />
    </section>
  )
}
