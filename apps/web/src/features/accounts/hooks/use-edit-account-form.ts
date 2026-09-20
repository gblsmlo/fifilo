import type { AccountResponse } from '@fifilo/core/accounts'
import { toastManager } from '@fifilo/ui/components/toast'
import { zodResolver } from '@hookform/resolvers/zod'
import { useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'

import { accountFeedback } from '../feedback'
import { AccountRequestError } from '../http/errors'
import { updateAccount } from '../http/update-account'
import {
  type AccountEditFormInput,
  type AccountEditFormValues,
  accountEditFormSchema,
} from '../schemas/account-edit-form'

export type { AccountEditFormInput, AccountEditFormValues } from '../schemas/account-edit-form'

export interface UseEditAccountFormParams {
  account: AccountResponse
  onSaved?: () => void
}

export function useEditAccountForm({ account, onSaved }: UseEditAccountFormParams) {
  const queryClient = useQueryClient()
  const form = useForm<AccountEditFormInput, unknown, AccountEditFormValues>({
    defaultValues: { institution: account.institution, name: account.name },
    mode: 'onSubmit',
    resolver: zodResolver(accountEditFormSchema),
  })

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      // `version` travels with the edit: a stale row is refused as a conflict
      // instead of overwriting someone else's change.
      await updateAccount(account.id, { ...values, version: account.version })

      toastManager.add(accountFeedback.update.success)
      await queryClient.invalidateQueries({ queryKey: ['accounts'] })
      onSaved?.()
    } catch (error) {
      const message =
        error instanceof AccountRequestError ? error.message : 'Não foi possível editar a conta.'

      if (error instanceof AccountRequestError && error.code === 'account_name_taken') {
        form.setError('name', { message, type: 'server' })
        return
      }

      toastManager.add(accountFeedback.update.failure(message))
    }
  })

  return { form, onSubmit }
}
