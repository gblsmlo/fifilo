import { SettingsRow, SettingsSection } from '@fifilo/patterns/settings'
import { Button } from '@fifilo/ui/components/button'
import { Field, FieldError } from '@fifilo/ui/components/field'
import {
  Select,
  SelectItem,
  SelectPopup,
  SelectTrigger,
  SelectValue,
} from '@fifilo/ui/components/select'
import { Switch } from '@fifilo/ui/components/switch'
import { Controller, useFormContext } from 'react-hook-form'

import type { UserPreferencesFormInput } from '../hooks/use-user-preferences-form'

const THEME_OPTIONS = [
  { label: 'Igual ao sistema', value: 'system' },
  { label: 'Claro', value: 'light' },
  { label: 'Escuro', value: 'dark' },
] as const

const DENSITY_OPTIONS = [
  { label: 'Confortável', value: 'comfortable' },
  { label: 'Compacta', value: 'compact' },
] as const

export interface UserPreferencesFormProps {
  isSubmitting: boolean
  onSubmit: () => void
}

export function UserPreferencesForm({
  isSubmitting,
  onSubmit,
}: Readonly<UserPreferencesFormProps>) {
  const {
    control,
    formState: { errors },
  } = useFormContext<UserPreferencesFormInput>()

  return (
    <form className='flex flex-col gap-4' noValidate onSubmit={onSubmit}>
      <SettingsSection title='Sua conta'>
        <SettingsRow description='Aplica-se só a você, neste workspace' title='Tema'>
          <Field className='w-44' invalid={Boolean(errors.theme)} name='theme'>
            <Controller
              control={control}
              name='theme'
              render={({ field }) => (
                <Select onValueChange={field.onChange} value={field.value}>
                  <SelectTrigger aria-label='Tema'>
                    <SelectValue placeholder='Selecione o tema' />
                  </SelectTrigger>
                  <SelectPopup>
                    {THEME_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectPopup>
                </Select>
              )}
            />
            <FieldError>{errors.theme?.message}</FieldError>
          </Field>
        </SettingsRow>

        <SettingsRow description='Espaçamento das listas e tabelas' title='Densidade'>
          <Field className='w-44' invalid={Boolean(errors.density)} name='density'>
            <Controller
              control={control}
              name='density'
              render={({ field }) => (
                <Select onValueChange={field.onChange} value={field.value}>
                  <SelectTrigger aria-label='Densidade'>
                    <SelectValue placeholder='Selecione a densidade' />
                  </SelectTrigger>
                  <SelectPopup>
                    {DENSITY_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectPopup>
                </Select>
              )}
            />
            <FieldError>{errors.density?.message}</FieldError>
          </Field>
        </SettingsRow>

        <SettingsRow description='Avisos por e-mail sobre a sua atividade' title='Notificações'>
          <Field invalid={Boolean(errors.notifyByEmail)} name='notifyByEmail'>
            <Controller
              control={control}
              name='notifyByEmail'
              render={({ field }) => (
                <Switch
                  aria-label='Notificações por e-mail'
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              )}
            />
          </Field>
        </SettingsRow>
      </SettingsSection>

      <div className='grid'>
        <Button loading={isSubmitting} type='submit'>
          Salvar preferências
        </Button>
      </div>
    </form>
  )
}
