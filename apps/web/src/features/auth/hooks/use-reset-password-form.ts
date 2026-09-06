import { toastManager } from '@fifilo/ui/components/toast'
import { zodResolver } from '@hookform/resolvers/zod'
import { useNavigate } from '@tanstack/react-router'
import { useForm } from 'react-hook-form'
import { authFeedback } from '../feedback'
import { resetPassword } from '../http/reset-password'
import {
  type ResetPasswordFormInput,
  type ResetPasswordFormValues,
  resetPasswordFormSchema,
} from '../schemas/reset-password-form'

export type {
  ResetPasswordFormInput,
  ResetPasswordFormValues,
} from '../schemas/reset-password-form'

interface UseResetPasswordFormParams {
  token: string
}

export function useResetPasswordForm({ token }: Readonly<UseResetPasswordFormParams>) {
  const navigate = useNavigate()
  const form = useForm<ResetPasswordFormInput, unknown, ResetPasswordFormValues>({
    defaultValues: {
      confirmPassword: '',
      newPassword: '',
    },
    resolver: zodResolver(resetPasswordFormSchema),
    mode: 'onSubmit',
  })

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      await resetPassword({
        newPassword: values.newPassword,
        token,
      })

      toastManager.add(authFeedback.resetPassword.success)

      await navigate({ to: '/login' })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Nao foi possivel redefinir a senha.'

      toastManager.add(authFeedback.resetPassword.failure(message))
    }
  })

  return {
    form,
    onSubmit,
  }
}
