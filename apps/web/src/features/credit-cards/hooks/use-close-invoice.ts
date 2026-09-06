import { toastManager } from '@fifilo/ui/components/toast'
import { useMutation, useQueryClient } from '@tanstack/react-query'

import { creditCardFeedback } from '../feedback'
import { closeInvoice } from '../http/close-invoice'
import { CreditCardRequestError } from '../http/errors'

export function useCloseInvoice(accountId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (invoiceId: string) => closeInvoice(invoiceId),
    onError: (error) => {
      const message =
        error instanceof CreditCardRequestError
          ? error.message
          : 'Não foi possível fechar a fatura.'
      toastManager.add(creditCardFeedback.closeInvoice.failure(message))
    },
    onSuccess: async () => {
      toastManager.add(creditCardFeedback.closeInvoice.success)
      await queryClient.invalidateQueries({ queryKey: ['credit-cards', accountId] })
    },
  })
}
