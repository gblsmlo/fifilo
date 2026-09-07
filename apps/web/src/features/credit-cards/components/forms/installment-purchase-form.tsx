import type { InstallmentShare } from '@fifilo/core/credit-cards'
import type { CurrencyCode } from '@fifilo/core/primitives'
import { Button } from '@fifilo/ui/components/button'
import { Field, FieldControl, FieldError, FieldLabel } from '@fifilo/ui/components/field'
import { Form } from '@fifilo/ui/components/form'
import { Input } from '@fifilo/ui/components/input'
import { MoneyInput } from '@fifilo/ui/components/money-input'
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

const selectClassName =
  'h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50'

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
        <FieldControl
          render={
            <select {...register('categoryId')} className={selectClassName}>
              <option value=''>Selecione uma categoria</option>
              {categoryOptions.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          }
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
        <div className='rounded-md border border-border p-3' data-testid='installment-preview'>
          <p className='mb-2 font-medium text-muted-foreground text-sm'>Parcelas calculadas</p>
          <ul className='flex flex-col gap-1 text-sm'>
            {preview.map((share) => (
              <li className='flex justify-between' key={share.installmentNumber}>
                <span>
                  {share.installmentNumber}/{preview.length} — {share.occurredOn}
                </span>
                <span>{formatMoney({ amountMinor: share.amountMinor, currency })}</span>
              </li>
            ))}
          </ul>
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
