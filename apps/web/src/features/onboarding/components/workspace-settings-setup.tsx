import { updateWorkspaceSettings, workspaceSettingsQueryOptions } from '@features/settings'
import { SettingsRequestError } from '@features/settings/http/errors'
import { updateWorkspaceSettingsRequestSchema } from '@fifilo/core/settings'
import { Button } from '@fifilo/ui/components/button'
import { Field, FieldDescription, FieldError, FieldLabel } from '@fifilo/ui/components/field'
import { Input } from '@fifilo/ui/components/input'
import {
  Select,
  SelectItem,
  SelectPopup,
  SelectTrigger,
  SelectValue,
} from '@fifilo/ui/components/select'
import { zodResolver } from '@hookform/resolvers/zod'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import type { FormEventHandler } from 'react'
import { Controller, FormProvider, useForm, useFormContext } from 'react-hook-form'
import type { z } from 'zod'
import { onboardingStatusQueryOptions } from '../query-options'

export const workspaceSettingsSetupSchema = updateWorkspaceSettingsRequestSchema
  .pick({ currency: true, locale: true, timezone: true, version: true })
  .required()

export type WorkspaceSetupInput = z.input<typeof workspaceSettingsSetupSchema>

const currencyOptions = [
  ['BRL', 'Real brasileiro (BRL)'],
  ['USD', 'Dólar americano (USD)'],
  ['EUR', 'Euro (EUR)'],
] as const

interface WorkspaceSettingsSetupProps {
  onSaved: () => void
}

export function WorkspaceSettingsSetup({ onSaved }: Readonly<WorkspaceSettingsSetupProps>) {
  const queryClient = useQueryClient()
  const query = useQuery(workspaceSettingsQueryOptions())
  const form = useForm<WorkspaceSetupInput>({
    resolver: zodResolver(workspaceSettingsSetupSchema),
    values: query.data
      ? {
          currency: query.data.currency,
          locale: query.data.locale,
          timezone: query.data.timezone,
          version: query.data.version,
        }
      : undefined,
  })
  const submit = form.handleSubmit(async (values) => {
    try {
      const updated = await updateWorkspaceSettings(values)
      queryClient.setQueryData(workspaceSettingsQueryOptions().queryKey, updated)
      await queryClient.invalidateQueries({ queryKey: onboardingStatusQueryOptions().queryKey })
      onSaved()
    } catch (cause) {
      if (cause instanceof SettingsRequestError && cause.code === 'version_conflict') {
        await query.refetch()
        form.setError('root', {
          message: 'As configurações mudaram. Revise os dados e tente novamente.',
        })
        return
      }
      form.setError('root', {
        message:
          cause instanceof SettingsRequestError
            ? cause.message
            : 'Não foi possível salvar as configurações.',
      })
    }
  })

  if (!query.data) return null

  return (
    <FormProvider {...form}>
      <WorkspaceSettingsSetupFields onSubmit={submit} />
    </FormProvider>
  )
}

interface WorkspaceSettingsSetupFieldsProps {
  onSubmit: FormEventHandler<HTMLFormElement>
}

export function WorkspaceSettingsSetupFields({
  onSubmit,
}: Readonly<WorkspaceSettingsSetupFieldsProps>) {
  const {
    control,
    formState: { errors, isSubmitting },
    register,
  } = useFormContext<WorkspaceSetupInput>()

  return (
    <form className='flex flex-col gap-5' noValidate onSubmit={onSubmit}>
      <Field name='currency'>
        <FieldLabel>Moeda</FieldLabel>
        <FieldDescription>Usada nas contas e lançamentos do workspace.</FieldDescription>
        <Controller
          control={control}
          name='currency'
          render={({ field }) => (
            <Select onValueChange={field.onChange} value={field.value}>
              <SelectTrigger aria-label='Moeda'>
                <SelectValue placeholder='Selecione a moeda'>
                  {(value) => currencyOptions.find(([code]) => code === value)?.[1] ?? value}
                </SelectValue>
              </SelectTrigger>
              <SelectPopup>
                {currencyOptions.map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectPopup>
            </Select>
          )}
        />
        <FieldError>{errors.currency?.message}</FieldError>
      </Field>
      <Field name='locale'>
        <FieldLabel>Idioma e formato</FieldLabel>
        <Input {...register('locale')} placeholder='pt-BR' />
        <FieldError>{errors.locale?.message}</FieldError>
      </Field>
      <Field name='timezone'>
        <FieldLabel>Fuso horário</FieldLabel>
        <Input {...register('timezone')} placeholder='America/Sao_Paulo' />
        <FieldError>{errors.timezone?.message}</FieldError>
      </Field>
      {errors.root?.message ? (
        <p className='text-destructive text-sm'>{errors.root.message}</p>
      ) : null}
      <Button loading={isSubmitting} type='submit'>
        Continuar
      </Button>
    </form>
  )
}
