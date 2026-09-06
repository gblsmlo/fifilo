import { zodResolver } from '@hookform/resolvers/zod'
import { useNavigate } from '@tanstack/react-router'
import { toastManager } from '@twincam/ui/components/toast'
import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { authFeedback } from '../feedback'
import { signIn } from '../http/sign-in'
import {
  type SignInFormInput,
  type SignInFormValues,
  signInFormSchema,
} from '../schemas/sign-in-form'

export type { SignInFormInput, SignInFormValues } from '../schemas/sign-in-form'

interface UseSignInFormParams {
  initialEmail?: string
  redirectTo: string
}

export function useSignInForm({ initialEmail, redirectTo }: Readonly<UseSignInFormParams>) {
  const navigate = useNavigate()
  const form = useForm<SignInFormInput, unknown, SignInFormValues>({
    defaultValues: {
      email: initialEmail ?? '',
      password: '',
    },
    resolver: zodResolver(signInFormSchema),
    mode: 'onSubmit',
  })

  useEffect(() => {
    if (initialEmail) {
      form.setValue('email', initialEmail, {
        shouldDirty: false,
        shouldTouch: false,
        shouldValidate: false,
      })
    }
  }, [form, initialEmail])

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      const result = await signIn(values)

      if (result.redirect && result.url) {
        window.location.assign(result.url)
        return
      }

      toastManager.add(authFeedback.signIn.success)

      await navigate({ to: redirectTo })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Nao foi possivel autenticar.'

      toastManager.add(authFeedback.signIn.failure(message))
    }
  })

  return {
    form,
    onSubmit,
  }
}
