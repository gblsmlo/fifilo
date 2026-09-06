import { queryOptions } from '@tanstack/react-query'

import { listCategories } from './http/list-categories'

/**
 * Shared by the route loader's initial prefetch and `useQuery` in the page,
 * so both sides agree on the same `queryKey`/`queryFn` (Decision 007).
 */
export const categoriesQueryOptions = (options: { includeArchived?: boolean } = {}) =>
  queryOptions({
    queryFn: () => listCategories(options),
    queryKey: ['categories', 'list', options.includeArchived ?? false],
  })
