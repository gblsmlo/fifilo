import { toastManager } from '@fifilo/ui/components/toast'
import { useMutation, useQueryClient } from '@tanstack/react-query'

import { accountFeedback } from '../feedback'
import { archiveAccount } from '../http/archive-account'
import { AccountRequestError } from '../http/errors'

export function useArchiveAccount() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => archiveAccount(id),
    onError: (error) => {
      const message =
        error instanceof AccountRequestError ? error.message : 'Não foi possível arquivar a conta.'
      toastManager.add(accountFeedback.archive.failure(message))
    },
    onSuccess: async () => {
      toastManager.add(accountFeedback.archive.success)
      await queryClient.invalidateQueries({ queryKey: ['accounts'] })
    },
  })
}
