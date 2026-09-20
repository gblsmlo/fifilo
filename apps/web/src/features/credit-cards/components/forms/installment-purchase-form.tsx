import type { InstallmentShare } from '@fifilo/core/credit-cards'
import type { CurrencyCode } from '@fifilo/core/primitives'
import { DataTable } from '@fifilo/patterns/data-table'
import { Button } from '@fifilo/ui/components/button'
import { Field, FieldError, FieldLabel } from '@fifilo/ui/components/field'
import { Form } from '@fifilo/ui/components/form'
import { Input } from '@fifilo/ui/components/input'
import { MoneyInput } from '@fifilo/ui/components/money-input'
import {
  Select,
  SelectItem,
  SelectPopup,
  SelectTrigger,
  SelectValue,
} from '@fifilo/ui/components/select'
import { Text } from '@fifilo/ui/components/text'
import { formatMoney } from '@libs/format-money'
import { Controller, FormProvider, useFormContext } from 'react-hook-form'

import {
  type InstallmentPurchaseFormInput,
  useCreateInstallmentPurchaseForm,
} from '../../hooks/use-create-installment-purchase-form'

interface SelectOption {
  id: string
  name: string
}

interface InstallmentPurchaseFormProps {
  accountId: string
  categoryOptions: readonly SelectOption[]
  currency: CurrencyCode
  onCreated?: () => void
}

export function InstallmentPurchaseForm({
  accountId,
  categoryOptions,
  currency,
  onCreated,
}: Readonly<InstallmentPurchaseFormProps>) {
  const { form, onSubmit, preview } = useCreateInstallmentPurchaseForm({
    accountId,
    currency,
    onCreated,
  })

  return (
    <FormProvider {...form}>
      <InstallmentPurchaseFormFields
        categoryOptions={categoryOptions}
        currency={currency}
        onSubmit={onSubmit}
        preview={preview}
      />
    </FormProvider>
  )
}

interface InstallmentPurchaseFormFieldsProps {
  categoryOptions: readonly SelectOption[]
  currency: CurrencyCode
  onSubmit: ReturnType<typeof useCreateInstallmentPurchaseForm>['onSubmit']
  preview: readonly InstallmentShare[]
}

export function InstallmentPurchaseFormFields({
  categoryOptions,
  currency,
  onSubmit,
  preview,
}: Readonly<InstallmentPurchaseFormFieldsProps>) {
  const {
    control,
    formState: { errors, isSubmitting },
    register,
  } = useFormContext<InstallmentPurchaseFormInput>()

  return (
    <Form className='flex flex-col gap-5' noValidate onSubmit={onSubmit}>
      <Field invalid={Boolean(errors.description)} name='description'>
        <FieldLabel>Descrição</FieldLabel>
        <Input {...register('description')} autoComplete='off' placeholder='Ex.: Notebook' />
        <FieldError>{errors.description?.message}</FieldError>
      </Field>

      <Field invalid={Boolean(errors.categoryId)} name='categoryId'>
        <FieldLabel>Categoria</FieldLabel>
        <Controller
          control={control}
          name='categoryId'
          render={({ field }) => (
            <Select onValueChange={field.onChange} value={field.value}>
              <SelectTrigger aria-label='Categoria'>
                <SelectValue placeholder='Selecione uma categoria'>
                  {(value) =>
                    categoryOptions.find((category) => category.id === value)?.name ?? value
                  }
                </SelectValue>
              </SelectTrigger>
              <SelectPopup>
                {categoryOptions.map((category) => (
                  <SelectItem key={category.id} value={category.id}>
                    {category.name}
                  </SelectItem>
                ))}
              </SelectPopup>
            </Select>
          )}
        />
        <FieldError>{errors.categoryId?.message}</FieldError>
      </Field>

      <Field invalid={Boolean(errors.totalMinor)} name='totalMinor'>
        <FieldLabel>Valor total</FieldLabel>
        <Controller
          control={control}
          name='totalMinor'
          render={({ field }) => (
            <MoneyInput onValueMinorChange={field.onChange} valueMinor={field.value} />
          )}
        />
        <FieldError>{errors.totalMinor?.message}</FieldError>
      </Field>

      <Field invalid={Boolean(errors.installments)} name='installments'>
        <FieldLabel>Número de parcelas</FieldLabel>
        <Input
          {...register('installments', { valueAsNumber: true })}
          max={60}
          min={2}
          type='number'
        />
        <FieldError>{errors.installments?.message}</FieldError>
      </Field>

      <Field invalid={Boolean(errors.firstOccurredOn)} name='firstOccurredOn'>
        <FieldLabel>Data da compra</FieldLabel>
        <Input {...register('firstOccurredOn')} type='date' />
        <FieldError>{errors.firstOccurredOn?.message}</FieldError>
      </Field>

      {preview.length > 0 ? (
        <div className='flex flex-col gap-2' data-testid='installment-preview'>
          <Text foreground='muted' render={<p />} size='sm' weight='medium'>
            Parcelas calculadas
          </Text>
          <DataTable
            caption='Parcelas calculadas'
            columns={[
              {
                cell: (share) => `${share.installmentNumber}/${preview.length}`,
                header: 'Parcela',
                id: 'installment',
              },
              { cell: (share) => share.occurredOn, header: 'Data', id: 'date' },
              {
                align: 'end',
                cell: (share) => formatMoney({ amountMinor: share.amountMinor, currency }),
                header: 'Valor',
                id: 'amount',
              },
            ]}
            rowKey={(share) => String(share.installmentNumber)}
            rows={preview}
          />
        </div>
      ) : null}

      <div className='grid'>
        <Button loading={isSubmitting} type='submit'>
          Registrar compra parcelada
        </Button>
      </div>
    </Form>
  )
}
