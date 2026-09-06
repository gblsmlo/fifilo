import { toastManager } from '@fifilo/ui/components/toast'
import { useMutation, useQueryClient } from '@tanstack/react-query'

import { transactionFeedback } from '../feedback'
import { deleteTransaction } from '../http/delete-transaction'
import { TransactionRequestError } from '../http/errors'

export function useDeleteTransaction() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => deleteTransaction(id),
    onError: (error) => {
      const message =
        error instanceof TransactionRequestError
          ? error.message
          : 'Não foi possível excluir a transação.'
      toastManager.add(transactionFeedback.delete.failure(message))
    },
    onSuccess: async () => {
      toastManager.add(transactionFeedback.delete.success)
      await queryClient.invalidateQueries({ queryKey: ['transactions'] })
      await queryClient.invalidateQueries({ queryKey: ['accounts', 'balances'] })
    },
  })
}
