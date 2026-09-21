import { updateWorkspaceSettings, workspaceSettingsQueryOptions } from '@features/settings'
import { SettingsRequestError } from '@features/settings/http/errors'
import { updateWorkspaceSettingsRequestSchema } from '@fifilo/core/settings'
import { Button } from '@fifilo/ui/components/button'
import { Field, FieldDescription, FieldError, FieldLabel } from '@fifilo/ui/components/field'
import { Form } from '@fifilo/ui/components/form'
import {
  Select,
  SelectItem,
  SelectPopup,
  SelectTrigger,
  SelectValue,
} from '@fifilo/ui/components/select'
import { Text } from '@fifilo/ui/components/text'
import { zodResolver } from '@hookform/resolvers/zod'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { type FormEventHandler, useState } from 'react'
import { Controller, FormProvider, useForm, useFormContext } from 'react-hook-form'
import type { z } from 'zod'
import { onboardingStatusQueryOptions } from '../query-options'
import {
  CURRENCY_OPTIONS,
  LOCALE_OPTIONS,
  currencyLabel,
  detectLocale,
  detectTimezone,
  localeLabel,
  timezoneOptions,
} from '../region'

export const workspaceSettingsSetupSchema = updateWorkspaceSettingsRequestSchema
  .pick({ currency: true, locale: true, timezone: true, version: true })
  .required()

export type WorkspaceSetupInput = z.input<typeof workspaceSettingsSetupSchema>

interface WorkspaceSettingsSetupProps {
  onSaved: () => void
}

export function WorkspaceSettingsSetup({ onSaved }: Readonly<WorkspaceSettingsSetupProps>) {
  const queryClient = useQueryClient()
  const query = useQuery(workspaceSettingsQueryOptions())
  const form = useForm<WorkspaceSetupInput>({
    resolver: zodResolver(workspaceSettingsSetupSchema),
    // The stored row is the workspace's default, never a choice anyone made:
    // this step only runs before the settings have ever been saved. What the
    // browser knows about the person doing the setup is the better guess.
    values: query.data
      ? {
          currency: query.data.currency,
          locale: detectLocale(),
          timezone: detectTimezone(),
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
  const [editing, setEditing] = useState(false)
  const {
    control,
    formState: { errors, isSubmitting },
    watch,
  } = useFormContext<WorkspaceSetupInput>()

  const zones = timezoneOptions(watch('timezone'))

  return (
    <Form className='flex flex-col gap-5' noValidate onSubmit={onSubmit}>
      {editing ? (
        <>
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
                      {(value) => currencyLabel(String(value))}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectPopup>
                    {CURRENCY_OPTIONS.map(([value, label]) => (
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
            <Controller
              control={control}
              name='locale'
              render={({ field }) => (
                <Select onValueChange={field.onChange} value={field.value}>
                  <SelectTrigger aria-label='Idioma e formato'>
                    <SelectValue placeholder='Selecione o idioma'>
                      {(value) => localeLabel(String(value))}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectPopup>
                    {LOCALE_OPTIONS.map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectPopup>
                </Select>
              )}
            />
            <FieldError>{errors.locale?.message}</FieldError>
          </Field>

          <Field name='timezone'>
            <FieldLabel>Fuso horário</FieldLabel>
            <Controller
              control={control}
              name='timezone'
              render={({ field }) => (
                <Select onValueChange={field.onChange} value={field.value}>
                  <SelectTrigger aria-label='Fuso horário'>
                    <SelectValue placeholder='Selecione o fuso' />
                  </SelectTrigger>
                  <SelectPopup>
                    {zones.map((zone) => (
                      <SelectItem key={zone} value={zone}>
                        {zone}
                      </SelectItem>
                    ))}
                  </SelectPopup>
                </Select>
              )}
            />
            <FieldError>{errors.timezone?.message}</FieldError>
          </Field>
        </>
      ) : (
        <Field name='region'>
          <FieldLabel>Detectamos sua região</FieldLabel>
          <FieldDescription>
            {`${currencyLabel(watch('currency'))} · ${watch('timezone')} · ${localeLabel(watch('locale'))}`}
          </FieldDescription>
        </Field>
      )}

      {errors.root?.message ? (
        <Text foreground='destructive' render={<p role='alert' />} size='sm'>
          {errors.root.message}
        </Text>
      ) : null}

      <div className='flex flex-wrap gap-3'>
        <Button loading={isSubmitting} type='submit'>
          {editing ? 'Continuar' : 'Está certo'}
        </Button>
        {editing ? null : (
          <Button onClick={() => setEditing(true)} type='button' variant='outline'>
            Alterar
          </Button>
        )}
      </div>
    </Form>
  )
}
