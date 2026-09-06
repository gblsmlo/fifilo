import { queryOptions } from '@tanstack/react-query'

import { getAvailableLimit } from './http/get-available-limit'
import { getInvoice } from './http/get-invoice'
import { listInvoices } from './http/list-invoices'

/**
 * Shared by the route loader's initial prefetch and `useQuery` in the page,
 * so both sides agree on the same `queryKey`/`queryFn` (Decision 007).
 */
export const availableLimitQueryOptions = (accountId: string) =>
  queryOptions({
    queryFn: () => getAvailableLimit(accountId),
    queryKey: ['credit-cards', accountId, 'available-limit'],
  })

export const invoicesQueryOptions = (accountId: string) =>
  queryOptions({
    queryFn: () => listInvoices(accountId),
    queryKey: ['credit-cards', accountId, 'invoices'],
  })

export const invoiceQueryOptions = (accountId: string, invoiceId: string) =>
  queryOptions({
    enabled: Boolean(invoiceId),
    queryFn: () => getInvoice(accountId, invoiceId),
    queryKey: ['credit-cards', accountId, 'invoices', invoiceId],
  })
