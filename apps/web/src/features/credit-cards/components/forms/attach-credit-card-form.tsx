import { Button } from '@fifilo/ui/components/button'
import { Field, FieldError, FieldLabel } from '@fifilo/ui/components/field'
import { Form } from '@fifilo/ui/components/form'
import { Input } from '@fifilo/ui/components/input'
import { MoneyInput } from '@fifilo/ui/components/money-input'
import { Controller, FormProvider, useFormContext } from 'react-hook-form'

import {
  type AttachCreditCardFormInput,
  useAttachCreditCardForm,
} from '../../hooks/use-attach-credit-card-form'

interface AttachCreditCardFormProps {
  accountId: string
  onAttached?: () => void
}

export function AttachCreditCardForm({
  accountId,
  onAttached,
}: Readonly<AttachCreditCardFormProps>) {
  const { form, onSubmit } = useAttachCreditCardForm({ accountId, onAttached })

  return (
    <FormProvider {...form}>
      <AttachCreditCardFormFields onSubmit={onSubmit} />
    </FormProvider>
  )
}

interface AttachCreditCardFormFieldsProps {
  onSubmit: ReturnType<typeof useAttachCreditCardForm>['onSubmit']
}

export function AttachCreditCardFormFields({
  onSubmit,
}: Readonly<AttachCreditCardFormFieldsProps>) {
  const {
    control,
    formState: { errors, isSubmitting },
    register,
  } = useFormContext<AttachCreditCardFormInput>()

  return (
    <Form className='flex flex-col gap-5' noValidate onSubmit={onSubmit}>
      <Field invalid={Boolean(errors.closingDay)} name='closingDay'>
        <FieldLabel>Dia de fechamento</FieldLabel>
        <Input
          {...register('closingDay', { valueAsNumber: true })}
          max={31}
          min={1}
          type='number'
        />
        <FieldError>{errors.closingDay?.message}</FieldError>
      </Field>

      <Field invalid={Boolean(errors.dueDay)} name='dueDay'>
        <FieldLabel>Dia de vencimento</FieldLabel>
        <Input {...register('dueDay', { valueAsNumber: true })} max={31} min={1} type='number' />
        <FieldError>{errors.dueDay?.message}</FieldError>
      </Field>

      <Field invalid={Boolean(errors.limitMinor)} name='limitMinor'>
        <FieldLabel>Limite</FieldLabel>
        <Controller
          control={control}
          name='limitMinor'
          render={({ field }) => (
            <MoneyInput onValueMinorChange={field.onChange} valueMinor={field.value} />
          )}
        />
        <FieldError>{errors.limitMinor?.message}</FieldError>
      </Field>

      <div className='grid'>
        <Button loading={isSubmitting} type='submit'>
          Cadastrar cartão
        </Button>
      </div>
    </Form>
  )
}
