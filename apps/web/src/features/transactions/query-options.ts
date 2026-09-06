import type { TransactionsPageResponse } from '@fifilo/core/transactions'
import { infiniteQueryOptions } from '@tanstack/react-query'

import { type ListTransactionsFilter, listTransactions } from './http/list-transactions'

/**
 * Shared by the route loader's initial prefetch and `useInfiniteQuery` in the
 * page (Decision 007). Pages by the server's own cursor (Fase 02 § API) -
 * `offset` never appears here.
 */
export const transactionsQueryOptions = (filter: Omit<ListTransactionsFilter, 'cursor'> = {}) =>
  infiniteQueryOptions({
    getNextPageParam: (lastPage: TransactionsPageResponse) => lastPage.nextCursor ?? undefined,
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam }: { pageParam: string | undefined }) =>
      listTransactions({ ...filter, cursor: pageParam }),
    queryKey: ['transactions', 'list', filter],
  })
