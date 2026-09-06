import type { InvoiceResponse, PayInvoiceRequest } from '@fifilo/core/credit-cards'
import { api } from '@libs/api-client'

import { normalizeCreditCardRequestError } from './errors'

/**
 * `pay` is the first command in the product that cannot duplicate (Fase 03
 * § API); a caller that omits `idempotencyKey` gets the API's own 400, not a
 * silently-repeatable request.
 */
export async function payInvoice(
  invoiceId: string,
  payload: PayInvoiceRequest,
  idempotencyKey: string,
): Promise<InvoiceResponse> {
  const { data, error } = await api.invoices({ id: invoiceId }).pay.post(payload, {
    headers: { 'idempotency-key': idempotencyKey },
  })

  if (error) {
    throw normalizeCreditCardRequestError(error.value, 'Não foi possível pagar a fatura.')
  }

  return data
}
