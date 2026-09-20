import type { AccountResponse } from '@fifilo/core/accounts'
import { Button } from '@fifilo/ui/components/button'
import { Field, FieldError, FieldLabel } from '@fifilo/ui/components/field'
import { Form } from '@fifilo/ui/components/form'
import { Input } from '@fifilo/ui/components/input'
import { FormProvider, useFormContext } from 'react-hook-form'

import { type AccountEditFormInput, useEditAccountForm } from '../../hooks/use-edit-account-form'

interface AccountEditFormProps {
  account: AccountResponse
  onSaved?: () => void
}

export function AccountEditForm({ account, onSaved }: Readonly<AccountEditFormProps>) {
  const { form, onSubmit } = useEditAccountForm({ account, onSaved })

  return (
    <FormProvider {...form}>
      <AccountEditFormFields onSubmit={onSubmit} />
    </FormProvider>
  )
}

interface AccountEditFormFieldsProps {
  onSubmit: ReturnType<typeof useEditAccountForm>['onSubmit']
}

export function AccountEditFormFields({ onSubmit }: Readonly<AccountEditFormFieldsProps>) {
  const {
    formState: { errors, isSubmitting },
    register,
  } = useFormContext<AccountEditFormInput>()

  return (
    <Form className='flex flex-col gap-5' noValidate onSubmit={onSubmit}>
      <Field invalid={Boolean(errors.name)} name='name'>
        <FieldLabel>Nome</FieldLabel>
        <Input {...register('name')} autoComplete='off' placeholder='Ex.: Conta corrente' />
        <FieldError>{errors.name?.message}</FieldError>
      </Field>

      <Field invalid={Boolean(errors.institution)} name='institution'>
        <FieldLabel>Instituição (opcional)</FieldLabel>
        <Input {...register('institution')} autoComplete='off' placeholder='Ex.: Banco Fifilo' />
        <FieldError>{errors.institution?.message}</FieldError>
      </Field>

      <div className='grid'>
        <Button loading={isSubmitting} type='submit'>
          Salvar
        </Button>
      </div>
    </Form>
  )
}
