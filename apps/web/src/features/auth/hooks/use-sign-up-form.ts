import { zodResolver } from '@hookform/resolvers/zod'
import { useNavigate } from '@tanstack/react-router'
import { toastManager } from '@twincam/ui/components/toast'
import { useForm } from 'react-hook-form'
import { authFeedback } from '../feedback'
import { AuthRequestError } from '../http/errors'
import { signUp } from '../http/sign-up'
import {
  type SignUpFormInput,
  type SignUpFormValues,
  signUpFormSchema,
} from '../schemas/sign-up-form'
import { encodeAuthRedirect } from '../utils/redirect'

export type { SignUpFormInput, SignUpFormValues } from '../schemas/sign-up-form'

interface UseSignUpFormParams {
  redirectTo: string
}

export function useSignUpForm({ redirectTo }: Readonly<UseSignUpFormParams>) {
  const navigate = useNavigate()
  const form = useForm<SignUpFormInput, unknown, SignUpFormValues>({
    defaultValues: {
      confirmPassword: '',
      email: '',
      name: '',
      password: '',
    },
    resolver: zodResolver(signUpFormSchema),
    mode: 'onSubmit',
  })

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      const result = await signUp(values)

      toastManager.add(authFeedback.signUp.success(result.message))

      form.reset()
      await navigate({
        search: {
          email: result.user.email,
          redirect: encodeAuthRedirect(redirectTo),
        },
        to: '/login',
      })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Nao foi possivel criar a conta.'

      if (error instanceof AuthRequestError && error.code === 'conflict') {
        form.setError('email', {
          message,
          type: 'server',
        })
      }

      if (error instanceof AuthRequestError && error.code === 'invalid_success_response') {
        toastManager.add(authFeedback.signUp.success(message))

        form.reset()
        await navigate({
          search: {
            email: values.email,
            redirect: encodeAuthRedirect(redirectTo),
          },
          to: '/login',
        })
        return
      }

      toastManager.add(authFeedback.signUp.failure(message))
    }
  })

  return {
    form,
    onSubmit,
  }
}
