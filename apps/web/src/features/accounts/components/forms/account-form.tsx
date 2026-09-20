import { Button } from '@fifilo/ui/components/button'
import { Field, FieldError, FieldLabel } from '@fifilo/ui/components/field'
import { Form } from '@fifilo/ui/components/form'
import { Input } from '@fifilo/ui/components/input'
import {
  Select,
  SelectItem,
  SelectPopup,
  SelectTrigger,
  SelectValue,
} from '@fifilo/ui/components/select'
import { Controller, FormProvider, useFormContext } from 'react-hook-form'

import { type AccountFormInput, useCreateAccountForm } from '../../hooks/use-create-account-form'

const ACCOUNT_KIND_LABELS: Record<AccountFormInput['kind'], string> = {
  checking: 'Conta corrente',
  credit_card: 'Cartão de crédito',
  investment: 'Investimento',
  savings: 'Poupança',
  wallet: 'Carteira',
}

interface AccountFormProps {
  onCreated?: () => void
}

export function AccountForm({ onCreated }: Readonly<AccountFormProps>) {
  const { form, onSubmit } = useCreateAccountForm({ onCreated })

  return (
    <FormProvider {...form}>
      <AccountFormFields onSubmit={onSubmit} />
    </FormProvider>
  )
}

interface AccountFormFieldsProps {
  onSubmit: ReturnType<typeof useCreateAccountForm>['onSubmit']
}

export function AccountFormFields({ onSubmit }: Readonly<AccountFormFieldsProps>) {
  const {
    control,
    formState: { errors, isSubmitting },
    register,
  } = useFormContext<AccountFormInput>()

  return (
    <Form className='flex flex-col gap-5' noValidate onSubmit={onSubmit}>
      <Field invalid={Boolean(errors.name)} name='name'>
        <FieldLabel>Nome</FieldLabel>
        <Input {...register('name')} autoComplete='off' placeholder='Ex.: Conta corrente' />
        <FieldError>{errors.name?.message}</FieldError>
      </Field>

      <Field invalid={Boolean(errors.kind)} name='kind'>
        <FieldLabel>Tipo</FieldLabel>
        <Controller
          control={control}
          name='kind'
          render={({ field }) => (
            <Select onValueChange={field.onChange} value={field.value}>
              <SelectTrigger aria-label='Tipo'>
                <SelectValue placeholder='Selecione o tipo'>
                  {(value) => ACCOUNT_KIND_LABELS[value as AccountFormInput['kind']] ?? value}
                </SelectValue>
              </SelectTrigger>
              <SelectPopup>
                {Object.entries(ACCOUNT_KIND_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectPopup>
            </Select>
          )}
        />
        <FieldError>{errors.kind?.message}</FieldError>
      </Field>

      <Field invalid={Boolean(errors.institution)} name='institution'>
        <FieldLabel>Instituição (opcional)</FieldLabel>
        <Input {...register('institution')} autoComplete='off' placeholder='Ex.: Banco Fifilo' />
        <FieldError>{errors.institution?.message}</FieldError>
      </Field>

      <div className='grid'>
        <Button loading={isSubmitting} type='submit'>
          Criar conta
        </Button>
      </div>
    </Form>
  )
}
