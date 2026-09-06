import type { InvoiceResponse } from '@fifilo/core/credit-cards'
import { api } from '@libs/api-client'

import { normalizeCreditCardRequestError } from './errors'

export async function listInvoices(accountId: string): Promise<InvoiceResponse[]> {
  const { data, error } = await api['credit-cards']({ id: accountId }).invoices.get()

  if (error) {
    throw normalizeCreditCardRequestError(error.value, 'Não foi possível carregar as faturas.')
  }

  return data
}
