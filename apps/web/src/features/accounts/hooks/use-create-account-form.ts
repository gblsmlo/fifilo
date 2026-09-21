// Deep import, not the feature barrel: `@features/transactions` reaches back
// into `@features/accounts`, and going through both barrels would close a
// cycle. `resolve-this-month` imports nothing from here.
import { civilDateToday } from '@features/transactions/resolve-this-month'
import type { AccountResponse } from '@fifilo/core/accounts'
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
  /** Receives the created account, so the caller can chain on its `kind`. */
  onCreated?: (account: AccountResponse) => void
  /**
   * `workspace_settings.timezone`, resolved by the caller. Required, not
   * defaulted: the API filters balances by the workspace's own civil today
   * (`accounts.routes.ts` § balances), so an opening entry prefilled from a
   * guessed timezone can land a day ahead of that filter and report the
   * account as empty right after it was funded.
   */
  timezone: string
}

export function useCreateAccountForm({ onCreated, timezone }: UseCreateAccountFormParams) {
  const queryClient = useQueryClient()
  const form = useForm<AccountFormInput, unknown, AccountFormValues>({
    defaultValues: {
      institution: null,
      kind: 'checking',
      name: '',
      openingBalanceDate: civilDateToday(timezone),
      openingBalanceMinor: 0,
    },
    mode: 'onSubmit',
    resolver: zodResolver(accountFormSchema),
  })

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      const account = await createAccount(values)

      toastManager.add(accountFeedback.create.success)
      form.reset()
      await queryClient.invalidateQueries({ queryKey: ['accounts'] })
      onCreated?.(account)
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
