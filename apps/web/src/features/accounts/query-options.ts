import { queryOptions } from '@tanstack/react-query'

import { getBalances } from './http/get-balances'
import { listAccounts } from './http/list-accounts'

/**
 * Shared by the route loader's initial prefetch and `useQuery` in the page,
 * so both sides agree on the same `queryKey`/`queryFn` (Decision 007).
 */
export const accountsQueryOptions = (options: { includeArchived?: boolean } = {}) =>
  queryOptions({
    queryFn: () => listAccounts(options),
    queryKey: ['accounts', 'list', options.includeArchived ?? false],
  })

export const accountBalancesQueryOptions = () =>
  queryOptions({
    queryFn: () => getBalances(),
    queryKey: ['accounts', 'balances'],
  })
