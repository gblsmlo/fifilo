import type { InvoiceResponse } from '@fifilo/core/credit-cards'
import { api } from '@libs/api-client'

import { normalizeCreditCardRequestError } from './errors'

export async function closeInvoice(invoiceId: string): Promise<InvoiceResponse> {
  const { data, error } = await api.invoices({ id: invoiceId }).close.post()

  if (error) {
    throw normalizeCreditCardRequestError(error.value, 'Não foi possível fechar a fatura.')
  }

  return data
}
