import type { PayInvoiceRequest } from '@fifilo/core/credit-cards'
import { toastManager } from '@fifilo/ui/components/toast'
import { useMutation, useQueryClient } from '@tanstack/react-query'

import { creditCardFeedback } from '../feedback'
import { CreditCardRequestError } from '../http/errors'
import { payInvoice } from '../http/pay-invoice'

export interface PayInvoiceInput {
  idempotencyKey: string
  invoiceId: string
  payload: PayInvoiceRequest
}

export function usePayInvoice(accountId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ idempotencyKey, invoiceId, payload }: PayInvoiceInput) =>
      payInvoice(invoiceId, payload, idempotencyKey),
    onError: (error) => {
      const message =
        error instanceof CreditCardRequestError ? error.message : 'Não foi possível pagar a fatura.'
      toastManager.add(creditCardFeedback.payInvoice.failure(message))
    },
    onSuccess: async () => {
      toastManager.add(creditCardFeedback.payInvoice.success)
      await queryClient.invalidateQueries({ queryKey: ['credit-cards', accountId] })
      await queryClient.invalidateQueries({ queryKey: ['accounts'] })
    },
  })
}
