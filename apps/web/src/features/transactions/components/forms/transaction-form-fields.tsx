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
import { Controller, useFormContext } from 'react-hook-form'

import type {
  ExpenseFormInput,
  IncomeFormInput,
  TransferFormInput,
} from '../../schemas/transaction-form'

interface SelectOption {
  id: string
  name: string
}

interface IncomeExpenseFieldsProps {
  accountOptions: readonly SelectOption[]
  categoryOptions: readonly SelectOption[]
  onSubmit: () => void
  submitLabel: string
}

/** Shared by the expense and income tabs: same fields, only the category list differs by kind. */
export function IncomeExpenseFormFields({
  accountOptions,
  categoryOptions,
  onSubmit,
  submitLabel,
}: Readonly<IncomeExpenseFieldsProps>) {
  const {
    control,
    formState: { errors, isSubmitting },
    register,
  } = useFormContext<ExpenseFormInput | IncomeFormInput>()

  return (
    <Form className='flex flex-col gap-5' noValidate onSubmit={onSubmit}>
      <Field invalid={Boolean(errors.description)} name='description'>
        <FieldLabel>Descrição</FieldLabel>
        <Input {...register('description')} autoComplete='off' placeholder='Ex.: Supermercado' />
        <FieldError>{errors.description?.message}</FieldError>
      </Field>

      <Field invalid={Boolean(errors.amountMinor)} name='amountMinor'>
        <FieldLabel>Valor</FieldLabel>
        <Controller
          control={control}
          name='amountMinor'
          render={({ field }) => (
            <MoneyInput onValueMinorChange={field.onChange} valueMinor={field.value} />
          )}
        />
        <FieldError>{errors.amountMinor?.message}</FieldError>
      </Field>

      <Field invalid={Boolean(errors.accountId)} name='accountId'>
        <FieldLabel>Conta</FieldLabel>
        <Controller
          control={control}
          name='accountId'
          render={({ field }) => (
            <Select onValueChange={field.onChange} value={field.value}>
              <SelectTrigger aria-label='Conta'>
                <SelectValue placeholder='Selecione uma conta'>
                  {(value) => accountOptions.find((account) => account.id === value)?.name ?? value}
                </SelectValue>
              </SelectTrigger>
              <SelectPopup>
                {accountOptions.map((account) => (
                  <SelectItem key={account.id} value={account.id}>
                    {account.name}
                  </SelectItem>
                ))}
              </SelectPopup>
            </Select>
          )}
        />
        <FieldError>{errors.accountId?.message}</FieldError>
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

      <Field invalid={Boolean(errors.occurredOn)} name='occurredOn'>
        <FieldLabel>Data</FieldLabel>
        <Input {...register('occurredOn')} type='date' />
        <FieldError>{errors.occurredOn?.message}</FieldError>
      </Field>

      <div className='grid'>
        <Button loading={isSubmitting} type='submit'>
          {submitLabel}
        </Button>
      </div>
    </Form>
  )
}

interface TransferFieldsProps {
  accountOptions: readonly SelectOption[]
  onSubmit: () => void
}

export function TransferFormFields({ accountOptions, onSubmit }: Readonly<TransferFieldsProps>) {
  const {
    control,
    formState: { errors, isSubmitting },
    register,
  } = useFormContext<TransferFormInput>()

  return (
    <Form className='flex flex-col gap-5' noValidate onSubmit={onSubmit}>
      <Field invalid={Boolean(errors.description)} name='description'>
        <FieldLabel>Descrição</FieldLabel>
        <Input {...register('description')} autoComplete='off' placeholder='Ex.: Reserva mensal' />
        <FieldError>{errors.description?.message}</FieldError>
      </Field>

      <Field invalid={Boolean(errors.amountMinor)} name='amountMinor'>
        <FieldLabel>Valor</FieldLabel>
        <Controller
          control={control}
          name='amountMinor'
          render={({ field }) => (
            <MoneyInput onValueMinorChange={field.onChange} valueMinor={field.value} />
          )}
        />
        <FieldError>{errors.amountMinor?.message}</FieldError>
      </Field>

      <Field invalid={Boolean(errors.fromAccountId)} name='fromAccountId'>
        <FieldLabel>Conta de origem</FieldLabel>
        <Controller
          control={control}
          name='fromAccountId'
          render={({ field }) => (
            <Select onValueChange={field.onChange} value={field.value}>
              <SelectTrigger aria-label='Conta de origem'>
                <SelectValue placeholder='Selecione uma conta'>
                  {(value) => accountOptions.find((account) => account.id === value)?.name ?? value}
                </SelectValue>
              </SelectTrigger>
              <SelectPopup>
                {accountOptions.map((account) => (
                  <SelectItem key={account.id} value={account.id}>
                    {account.name}
                  </SelectItem>
                ))}
              </SelectPopup>
            </Select>
          )}
        />
        <FieldError>{errors.fromAccountId?.message}</FieldError>
      </Field>

      <Field invalid={Boolean(errors.toAccountId)} name='toAccountId'>
        <FieldLabel>Conta de destino</FieldLabel>
        <Controller
          control={control}
          name='toAccountId'
          render={({ field }) => (
            <Select onValueChange={field.onChange} value={field.value}>
              <SelectTrigger aria-label='Conta de destino'>
                <SelectValue placeholder='Selecione uma conta'>
                  {(value) => accountOptions.find((account) => account.id === value)?.name ?? value}
                </SelectValue>
              </SelectTrigger>
              <SelectPopup>
                {accountOptions.map((account) => (
                  <SelectItem key={account.id} value={account.id}>
                    {account.name}
                  </SelectItem>
                ))}
              </SelectPopup>
            </Select>
          )}
        />
        <FieldError>{errors.toAccountId?.message}</FieldError>
      </Field>

      <Field invalid={Boolean(errors.occurredOn)} name='occurredOn'>
        <FieldLabel>Data</FieldLabel>
        <Input {...register('occurredOn')} type='date' />
        <FieldError>{errors.occurredOn?.message}</FieldError>
      </Field>

      <div className='grid'>
        <Button loading={isSubmitting} type='submit'>
          Transferir
        </Button>
      </div>
    </Form>
  )
}
