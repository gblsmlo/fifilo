import { toastManager } from '@fifilo/ui/components/toast'
import { useMutation, useQueryClient } from '@tanstack/react-query'

import { categoryFeedback } from '../feedback'
import { CategoryRequestError } from '../http/errors'
import { reassignCategory } from '../http/reassign-category'

export interface ReassignCategoryInput {
  id: string
  targetCategoryId?: string
}

export function useReassignCategory() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, targetCategoryId }: ReassignCategoryInput) =>
      reassignCategory(id, { targetCategoryId }),
    onError: (error) => {
      // `target_category_required` is not a failure the toast should own: the
      // dialog stays open and asks for a target instead (Fase 02 § Riscos).
      if (error instanceof CategoryRequestError && error.code === 'target_category_required') {
        return
      }

      const message =
        error instanceof CategoryRequestError
          ? error.message
          : 'Não foi possível reatribuir a categoria.'
      toastManager.add(categoryFeedback.reassign.failure(message))
    },
    onSuccess: async () => {
      toastManager.add(categoryFeedback.reassign.success)
      await queryClient.invalidateQueries({ queryKey: ['categories'] })
    },
  })
}
