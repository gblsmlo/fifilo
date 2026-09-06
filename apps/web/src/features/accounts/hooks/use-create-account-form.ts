import { toastManager } from '@fifilo/ui/components/toast'
import { zodResolver } from '@hookform/resolvers/zod'
import { useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'

import { accountFeedback } from '../feedback'
import { createAccount } from '../http/create-account'
import { AccountRequestError } from '../http/errors'
import {
  type AccountFormInput,
  type AccountFormValues,
  accountFormSchema,
} from '../schemas/account-form'

export type { AccountFormInput, AccountFormValues } from '../schemas/account-form'

export interface UseCreateAccountFormParams {
  onCreated?: () => void
}

export function useCreateAccountForm({ onCreated }: UseCreateAccountFormParams = {}) {
  const queryClient = useQueryClient()
  const form = useForm<AccountFormInput, unknown, AccountFormValues>({
    defaultValues: { institution: null, kind: 'checking', name: '' },
    mode: 'onSubmit',
    resolver: zodResolver(accountFormSchema),
  })

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      await createAccount(values)

      toastManager.add(accountFeedback.create.success)
      form.reset()
      await queryClient.invalidateQueries({ queryKey: ['accounts'] })
      onCreated?.()
    } catch (error) {
      const message =
        error instanceof AccountRequestError ? error.message : 'Não foi possível criar a conta.'

      if (error instanceof AccountRequestError && error.code === 'account_name_taken') {
        form.setError('name', { message, type: 'server' })
        return
      }

      toastManager.add(accountFeedback.create.failure(message))
    }
  })

  return { form, onSubmit }
}
