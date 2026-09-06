import { Button } from '@fifilo/ui/components/button'
import { Field, FieldDescription, FieldError, FieldLabel } from '@fifilo/ui/components/field'
import { Form } from '@fifilo/ui/components/form'
import { Input } from '@fifilo/ui/components/input'
import { Link } from '@tanstack/react-router'
import { FormProvider, useFormContext } from 'react-hook-form'
import { PasswordField } from '../../../../components/password-field'

import type { SignInFormValues } from '../../hooks/use-sign-in-form'
import { useSignInForm } from '../../hooks/use-sign-in-form'
import { encodeAuthRedirect } from '../../utils/redirect'

interface SignInFormProps {
  initialEmail?: string
  redirectTo: string
}

export function SignInForm({ initialEmail, redirectTo }: Readonly<SignInFormProps>) {
  const { form, onSubmit } = useSignInForm({ initialEmail, redirectTo })

  return (
    <FormProvider {...form}>
      <SignInFormFields onSubmit={onSubmit} redirectTo={redirectTo} />
    </FormProvider>
  )
}

interface SignInFormFieldsProps {
  onSubmit: ReturnType<typeof useSignInForm>['onSubmit']
  redirectTo: string
}

export function SignInFormFields({ onSubmit, redirectTo }: Readonly<SignInFormFieldsProps>) {
  const {
    formState: { errors, isSubmitting },
    register,
    watch,
  } = useFormContext<SignInFormValues>()
  const email = watch('email')

  return (
    <Form className='flex flex-col gap-5' noValidate onSubmit={onSubmit}>
      <Field invalid={Boolean(errors.email)} name='email'>
        <FieldLabel>Email</FieldLabel>
        <Input
          {...register('email')}
          autoComplete='email'
          inputMode='email'
          placeholder='voce@empresa.com'
          type='email'
        />
        <FieldDescription>Use o e-mail da sua conta.</FieldDescription>
        <FieldError>{errors.email?.message}</FieldError>
      </Field>

      <Field invalid={Boolean(errors.password)} name='password'>
        <FieldLabel>Senha</FieldLabel>
        <PasswordField
          {...register('password')}
          autoComplete='current-password'
          placeholder='Sua senha'
        />
        <FieldError>{errors.password?.message}</FieldError>
      </Field>

      <div className='flex items-center justify-between gap-3 text-sm'>
        <Link
          className='text-cyan-200 transition-colors hover:text-cyan-100'
          search={{ email: email || undefined }}
          to='/forgotten-password'
        >
          Esqueci minha senha
        </Link>
        <Link
          className='text-slate-300 transition-colors hover:text-white'
          search={{ redirect: encodeAuthRedirect(redirectTo) }}
          to='/sign-up'
        >
          Criar conta
        </Link>
      </div>

      <div className='grid'>
        <Button loading={isSubmitting} type='submit'>
          Entrar
        </Button>
      </div>
    </Form>
  )
}
