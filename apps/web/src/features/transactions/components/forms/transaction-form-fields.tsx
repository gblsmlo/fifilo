import { Button } from '@fifilo/ui/components/button'
import { Field, FieldControl, FieldError, FieldLabel } from '@fifilo/ui/components/field'
import { Form } from '@fifilo/ui/components/form'
import { Input } from '@fifilo/ui/components/input'
import { MoneyInput } from '@fifilo/ui/components/money-input'
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

const selectClassName =
  'h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50'

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
        <FieldControl
          render={
            <select {...register('accountId')} className={selectClassName}>
              <option value=''>Selecione uma conta</option>
              {accountOptions.map((account) => (
                <option key={account.id} value={account.id}>
                  {account.name}
                </option>
              ))}
            </select>
          }
        />
        <FieldError>{errors.accountId?.message}</FieldError>
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
        <FieldControl
          render={
            <select {...register('fromAccountId')} className={selectClassName}>
              <option value=''>Selecione uma conta</option>
              {accountOptions.map((account) => (
                <option key={account.id} value={account.id}>
                  {account.name}
                </option>
              ))}
            </select>
          }
        />
        <FieldError>{errors.fromAccountId?.message}</FieldError>
      </Field>

      <Field invalid={Boolean(errors.toAccountId)} name='toAccountId'>
        <FieldLabel>Conta de destino</FieldLabel>
        <FieldControl
          render={
            <select {...register('toAccountId')} className={selectClassName}>
              <option value=''>Selecione uma conta</option>
              {accountOptions.map((account) => (
                <option key={account.id} value={account.id}>
                  {account.name}
                </option>
              ))}
            </select>
          }
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
