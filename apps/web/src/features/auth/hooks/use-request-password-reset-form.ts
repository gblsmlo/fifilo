import { toastManager } from '@fifilo/ui/components/toast'
import { zodResolver } from '@hookform/resolvers/zod'
import { useNavigate } from '@tanstack/react-router'
import { useForm } from 'react-hook-form'
import { authFeedback } from '../feedback'
import { requestPasswordReset } from '../http/request-password-reset'
import {
  type ForgottenPasswordFormInput,
  type ForgottenPasswordFormValues,
  forgottenPasswordFormSchema,
} from '../schemas/forgotten-password-form'

export type {
  ForgottenPasswordFormInput,
  ForgottenPasswordFormValues,
} from '../schemas/forgotten-password-form'

interface UseRequestPasswordResetFormParams {
  initialEmail?: string
}

export function useRequestPasswordResetForm({
  initialEmail,
}: Readonly<UseRequestPasswordResetFormParams>) {
  const navigate = useNavigate()
  const form = useForm<ForgottenPasswordFormInput, unknown, ForgottenPasswordFormValues>({
    defaultValues: {
      email: initialEmail ?? '',
    },
    resolver: zodResolver(forgottenPasswordFormSchema),
    mode: 'onSubmit',
  })

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      const redirectTo = `${window.location.origin}/reset-password`
      await requestPasswordReset({
        email: values.email,
        redirectTo,
      })

      toastManager.add(authFeedback.requestPasswordReset.success)

      await navigate({
        search: { email: values.email },
        to: '/login',
      })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Nao foi possivel enviar o link.'

      toastManager.add(authFeedback.requestPasswordReset.failure(message))
    }
  })

  return {
    form,
    onSubmit,
  }
}
