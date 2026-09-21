// Deep import, not the feature barrel: `@features/credit-cards` reaches back
// into `@features/accounts`, and going through both barrels would close a
// cycle. This module imports nothing from here.
import { AttachCreditCardForm } from '@features/credit-cards/components/forms/attach-credit-card-form'
import { workspaceSettingsQueryOptions } from '@features/settings'
import { Button } from '@fifilo/ui/components/button'
import { Field, FieldDescription, FieldError, FieldLabel } from '@fifilo/ui/components/field'
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
import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
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
  const settingsQuery = useQuery(workspaceSettingsQueryOptions())

  if (!settingsQuery.data) return null

  return <AccountFormWithSettings onCreated={onCreated} timezone={settingsQuery.data.timezone} />
}

interface AccountFormWithSettingsProps extends AccountFormProps {
  timezone: string
}

function AccountFormWithSettings({ onCreated, timezone }: Readonly<AccountFormWithSettingsProps>) {
  // A card's closing day, due day and limit come from their own endpoint, so
  // creating the account alone leaves one that cannot hold an invoice. The
  // second step runs here rather than being discovered later in a row menu.
  const [cardToConfigure, setCardToConfigure] = useState<string | null>(null)
  const { form, onSubmit } = useCreateAccountForm({
    onCreated: (account) => {
      if (account.kind === 'credit_card') {
        setCardToConfigure(account.id)
        return
      }
      onCreated?.()
    },
    timezone,
  })

  if (cardToConfigure) {
    return (
      <div className='flex flex-col gap-5'>
        <Text size='sm'>Falta o fechamento, o vencimento e o limite para o cartão funcionar.</Text>
        <AttachCreditCardForm
          accountId={cardToConfigure}
          onAttached={() => {
            setCardToConfigure(null)
            onCreated?.()
          }}
        />
      </div>
    )
  }

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

      <Field invalid={Boolean(errors.openingBalanceMinor)} name='openingBalanceMinor'>
        <FieldLabel>Saldo hoje</FieldLabel>
        <FieldDescription>
          O saldo que aparece no seu extrato agora. Entra no total como ponto de partida, sem virar
          um lançamento.
        </FieldDescription>
        <Controller
          control={control}
          name='openingBalanceMinor'
          render={({ field }) => (
            <MoneyInput onValueMinorChange={field.onChange} valueMinor={field.value ?? 0} />
          )}
        />
        <FieldError>{errors.openingBalanceMinor?.message}</FieldError>
      </Field>

      <Field invalid={Boolean(errors.openingBalanceDate)} name='openingBalanceDate'>
        <FieldLabel>Data do saldo</FieldLabel>
        <Input {...register('openingBalanceDate')} type='date' />
        <FieldError>{errors.openingBalanceDate?.message}</FieldError>
      </Field>

      <div className='grid'>
        <Button loading={isSubmitting} type='submit'>
          Criar conta
        </Button>
      </div>
    </Form>
  )
}
