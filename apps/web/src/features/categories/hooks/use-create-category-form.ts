import { toastManager } from '@fifilo/ui/components/toast'
import { zodResolver } from '@hookform/resolvers/zod'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'

import { categoryFeedback } from '../feedback'
import { createCategory } from '../http/create-category'
import { CategoryRequestError } from '../http/errors'
import { categoriesQueryOptions } from '../query-options'
import {
  type CategoryFormInput,
  type CategoryFormValues,
  categoryFormSchema,
} from '../schemas/category-form'

export type { CategoryFormInput, CategoryFormValues } from '../schemas/category-form'

export interface UseCreateCategoryFormParams {
  onCreated?: () => void
}

export function useCreateCategoryForm({ onCreated }: UseCreateCategoryFormParams = {}) {
  const queryClient = useQueryClient()
  const categoriesQuery = useQuery(categoriesQueryOptions())
  const form = useForm<CategoryFormInput, unknown, CategoryFormValues>({
    defaultValues: { kind: 'expense', name: '', parentId: null },
    mode: 'onSubmit',
    resolver: zodResolver(categoryFormSchema),
  })

  const kind = form.watch('kind')
  const parentOptions = (categoriesQuery.data ?? []).filter(
    (category) => category.kind === kind && category.parentId === null && !category.archivedAt,
  )

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      await createCategory(values)

      toastManager.add(categoryFeedback.create.success)
      form.reset({ kind: values.kind, name: '', parentId: null })
      await queryClient.invalidateQueries({ queryKey: ['categories'] })
      onCreated?.()
    } catch (error) {
      const message =
        error instanceof CategoryRequestError
          ? error.message
          : 'Não foi possível criar a categoria.'

      if (error instanceof CategoryRequestError && error.code === 'category_name_taken') {
        form.setError('name', { message, type: 'server' })
        return
      }

      toastManager.add(categoryFeedback.create.failure(message))
    }
  })

  return { form, onSubmit, parentOptions }
}
