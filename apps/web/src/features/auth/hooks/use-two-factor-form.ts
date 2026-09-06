import { toastManager } from '@fifilo/ui/components/toast'
import { zodResolver } from '@hookform/resolvers/zod'
import { useNavigate } from '@tanstack/react-router'
import { useForm } from 'react-hook-form'
import { authFeedback } from '../feedback'
import { verifyTotp } from '../http/two-factor'
import {
  type TwoFactorFormInput,
  type TwoFactorFormValues,
  twoFactorFormSchema,
} from '../schemas/two-factor-form'

export type { TwoFactorFormInput, TwoFactorFormValues } from '../schemas/two-factor-form'

interface UseTwoFactorFormParams {
  redirectTo: string
}

export function useTwoFactorForm({ redirectTo }: Readonly<UseTwoFactorFormParams>) {
  const navigate = useNavigate()
  const form = useForm<TwoFactorFormInput, unknown, TwoFactorFormValues>({
    defaultValues: {
      code: '',
    },
    mode: 'onSubmit',
    resolver: zodResolver(twoFactorFormSchema),
  })

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      await verifyTotp({
        code: values.code,
      })

      toastManager.add(authFeedback.twoFactor.success)

      await navigate({ to: redirectTo })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Codigo de autenticacao invalido.'

      toastManager.add(authFeedback.twoFactor.failure(message))
    }
  })

  return {
    form,
    onSubmit,
  }
}
