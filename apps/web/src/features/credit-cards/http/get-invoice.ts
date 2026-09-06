import type { InvoiceWithItemsResponse } from '@fifilo/core/credit-cards'
import { api } from '@libs/api-client'

import { normalizeCreditCardRequestError } from './errors'

export async function getInvoice(
  accountId: string,
  invoiceId: string,
): Promise<InvoiceWithItemsResponse> {
  const { data, error } = await api['credit-cards']({ id: accountId })
    .invoices({
      invoiceId,
    })
    .get()

  if (error) {
    throw normalizeCreditCardRequestError(error.value, 'Não foi possível carregar a fatura.')
  }

  return data
}
