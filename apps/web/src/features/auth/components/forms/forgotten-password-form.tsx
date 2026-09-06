import { Button } from '@twincam/ui/components/button'
import { Field, FieldDescription, FieldError, FieldLabel } from '@twincam/ui/components/field'
import { Form } from '@twincam/ui/components/form'
import { Input } from '@twincam/ui/components/input'
import { FormProvider, useFormContext } from 'react-hook-form'

import type { ForgottenPasswordFormInput } from '../../hooks/use-request-password-reset-form'
import { useRequestPasswordResetForm } from '../../hooks/use-request-password-reset-form'

interface ForgottenPasswordFormProps {
  initialEmail?: string
}

export function ForgottenPasswordForm({ initialEmail }: Readonly<ForgottenPasswordFormProps>) {
  const { form, onSubmit } = useRequestPasswordResetForm({ initialEmail })

  return (
    <FormProvider {...form}>
      <ForgottenPasswordFormFields onSubmit={onSubmit} />
    </FormProvider>
  )
}

interface ForgottenPasswordFormFieldsProps {
  onSubmit: ReturnType<typeof useRequestPasswordResetForm>['onSubmit']
}

export function ForgottenPasswordFormFields({
  onSubmit,
}: Readonly<ForgottenPasswordFormFieldsProps>) {
  const {
    formState: { errors, isSubmitting },
    register,
  } = useFormContext<ForgottenPasswordFormInput>()

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
        <FieldDescription>
          Enviaremos um link com token unico para redefinir a senha.
        </FieldDescription>
        <FieldError>{errors.email?.message}</FieldError>
      </Field>

      <div className='grid'>
        <Button loading={isSubmitting} type='submit'>
          Enviar link
        </Button>
      </div>
    </Form>
  )
}
