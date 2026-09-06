import { Button } from '@twincam/ui/components/button'
import { Field, FieldDescription, FieldError, FieldLabel } from '@twincam/ui/components/field'
import { Form } from '@twincam/ui/components/form'
import { Input } from '@twincam/ui/components/input'
import { FormProvider, useFormContext } from 'react-hook-form'

import type { TwoFactorFormInput } from '../../hooks/use-two-factor-form'
import { useTwoFactorForm } from '../../hooks/use-two-factor-form'

interface TwoFactorFormProps {
  redirectTo: string
}

export function TwoFactorForm({ redirectTo }: Readonly<TwoFactorFormProps>) {
  const { form, onSubmit } = useTwoFactorForm({ redirectTo })

  return (
    <FormProvider {...form}>
      <TwoFactorFormFields onSubmit={onSubmit} />
    </FormProvider>
  )
}

interface TwoFactorFormFieldsProps {
  onSubmit: ReturnType<typeof useTwoFactorForm>['onSubmit']
}

export function TwoFactorFormFields({ onSubmit }: Readonly<TwoFactorFormFieldsProps>) {
  const {
    formState: { errors, isSubmitting },
    register,
  } = useFormContext<TwoFactorFormInput>()

  return (
    <Form className='flex flex-col gap-5' noValidate onSubmit={onSubmit}>
      <p className='text-muted-foreground text-sm'>
        Informe o codigo temporario do seu aplicativo autenticador para continuar.
      </p>

      <Field invalid={Boolean(errors.code)} name='code'>
        <FieldLabel>Codigo TOTP</FieldLabel>
        <Input
          {...register('code', {
            setValueAs: (value) => (typeof value === 'string' ? value.trim() : value),
          })}
          autoComplete='one-time-code'
          inputMode='numeric'
          maxLength={8}
          minLength={6}
          placeholder='000000'
          type='text'
        />
        <FieldDescription>Use o codigo do aplicativo autenticador.</FieldDescription>
        <FieldError>{errors.code?.message}</FieldError>
      </Field>

      <div className='grid'>
        <Button loading={isSubmitting} type='submit'>
          Verificar codigo
        </Button>
      </div>
    </Form>
  )
}
