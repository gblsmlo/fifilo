import { Button } from '@fifilo/ui/components/button'
import { Field, FieldDescription, FieldError, FieldLabel } from '@fifilo/ui/components/field'
import { Form } from '@fifilo/ui/components/form'
import { FormProvider, useFormContext } from 'react-hook-form'

import { PasswordField } from '../../../../components/password-field'
import type { ResetPasswordFormInput } from '../../hooks/use-reset-password-form'
import { useResetPasswordForm } from '../../hooks/use-reset-password-form'

interface ResetPasswordFormProps {
  token: string
}

export function ResetPasswordForm({ token }: Readonly<ResetPasswordFormProps>) {
  const { form, onSubmit } = useResetPasswordForm({ token })

  return (
    <FormProvider {...form}>
      <ResetPasswordFormFields onSubmit={onSubmit} />
    </FormProvider>
  )
}

interface ResetPasswordFormFieldsProps {
  onSubmit: ReturnType<typeof useResetPasswordForm>['onSubmit']
}

export function ResetPasswordFormFields({ onSubmit }: Readonly<ResetPasswordFormFieldsProps>) {
  const {
    formState: { errors, isSubmitting },
    register,
  } = useFormContext<ResetPasswordFormInput>()

  return (
    <Form className='flex flex-col gap-5' noValidate onSubmit={onSubmit}>
      <Field invalid={Boolean(errors.newPassword)} name='newPassword'>
        <FieldLabel>Nova senha</FieldLabel>
        <PasswordField
          {...register('newPassword')}
          autoComplete='new-password'
          placeholder='Mínimo de 12 caracteres'
        />
        <FieldDescription>Use uma senha nova e diferente da anterior.</FieldDescription>
        <FieldError>{errors.newPassword?.message}</FieldError>
      </Field>

      <Field invalid={Boolean(errors.confirmPassword)} name='confirmPassword'>
        <FieldLabel>Confirmar senha</FieldLabel>
        <PasswordField
          {...register('confirmPassword')}
          autoComplete='new-password'
          placeholder='Repita a nova senha'
          toggleLabel='confirmação'
        />
        <FieldError>{errors.confirmPassword?.message}</FieldError>
      </Field>

      <div className='grid'>
        <Button loading={isSubmitting} type='submit'>
          Atualizar senha
        </Button>
      </div>
    </Form>
  )
}
