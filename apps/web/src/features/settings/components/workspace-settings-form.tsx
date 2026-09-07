import { SettingsRow, SettingsSection } from '@fifilo/patterns/settings'
import { Button } from '@fifilo/ui/components/button'
import { Field, FieldError } from '@fifilo/ui/components/field'
import { Input } from '@fifilo/ui/components/input'
import {
  Select,
  SelectItem,
  SelectPopup,
  SelectTrigger,
  SelectValue,
} from '@fifilo/ui/components/select'
import { Controller, useFormContext } from 'react-hook-form'

import type { WorkspaceSettingsFormInput } from '../hooks/use-workspace-settings-form'

const CURRENCY_OPTIONS = [
  { label: 'Real brasileiro (BRL)', value: 'BRL' },
  { label: 'Dólar americano (USD)', value: 'USD' },
  { label: 'Euro (EUR)', value: 'EUR' },
  { label: 'Libra esterlina (GBP)', value: 'GBP' },
  { label: 'Iene japonês (JPY)', value: 'JPY' },
  { label: 'Dinar bareinita (BHD)', value: 'BHD' },
] as const

const WEEK_START_OPTIONS = [
  { label: 'Segunda-feira', value: 'monday' },
  { label: 'Domingo', value: 'sunday' },
] as const

export interface WorkspaceSettingsFormProps {
  canEdit: boolean
  isSubmitting: boolean
  onSubmit: () => void
}

/**
 * `canEdit` disables every control instead of hiding the form (Fase 06 §
 * Modelagem: only owner and admin change these) - a member or viewer still
 * sees the workspace's own currency, locale and month start, just cannot
 * change them.
 */
export function WorkspaceSettingsForm({
  canEdit,
  isSubmitting,
  onSubmit,
}: Readonly<WorkspaceSettingsFormProps>) {
  const {
    control,
    formState: { errors },
    register,
  } = useFormContext<WorkspaceSettingsFormInput>()

  return (
    <form className='flex flex-col gap-4' noValidate onSubmit={onSubmit}>
      <SettingsSection title='Workspace'>
        <SettingsRow description='Moeda de toda conta e lançamento' title='Moeda'>
          <Field className='w-52' invalid={Boolean(errors.currency)} name='currency'>
            <Controller
              control={control}
              name='currency'
              render={({ field }) => (
                <Select disabled={!canEdit} onValueChange={field.onChange} value={field.value}>
                  <SelectTrigger aria-label='Moeda'>
                    <SelectValue placeholder='Selecione a moeda' />
                  </SelectTrigger>
                  <SelectPopup>
                    {CURRENCY_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectPopup>
                </Select>
              )}
            />
            <FieldError>{errors.currency?.message}</FieldError>
          </Field>
        </SettingsRow>

        <SettingsRow description='Formatação de número e data no Web' title='Idioma'>
          <Field className='w-40' invalid={Boolean(errors.locale)} name='locale'>
            <Input
              {...register('locale')}
              aria-label='Idioma'
              disabled={!canEdit}
              placeholder='pt-BR'
            />
            <FieldError>{errors.locale?.message}</FieldError>
          </Field>
        </SettingsRow>

        <SettingsRow
          description='Resolve "hoje" e "este mês" antes de virar data civil'
          title='Fuso horário'
        >
          <Field className='w-52' invalid={Boolean(errors.timezone)} name='timezone'>
            <Input
              {...register('timezone')}
              aria-label='Fuso horário'
              disabled={!canEdit}
              placeholder='America/Sao_Paulo'
            />
            <FieldError>{errors.timezone?.message}</FieldError>
          </Field>
        </SettingsRow>

        <SettingsRow
          description='Para um mês financeiro que não começa no dia 1'
          title='Início do mês financeiro'
        >
          <Field className='w-24' invalid={Boolean(errors.monthStartDay)} name='monthStartDay'>
            <Input
              {...register('monthStartDay', { valueAsNumber: true })}
              aria-label='Início do mês financeiro'
              disabled={!canEdit}
              max={28}
              min={1}
              type='number'
            />
            <FieldError>{errors.monthStartDay?.message}</FieldError>
          </Field>
        </SettingsRow>

        <SettingsRow description='Agrupamento semanal' title='Início da semana'>
          <Field className='w-40' invalid={Boolean(errors.weekStartsOn)} name='weekStartsOn'>
            <Controller
              control={control}
              name='weekStartsOn'
              render={({ field }) => (
                <Select disabled={!canEdit} onValueChange={field.onChange} value={field.value}>
                  <SelectTrigger aria-label='Início da semana'>
                    <SelectValue placeholder='Selecione' />
                  </SelectTrigger>
                  <SelectPopup>
                    {WEEK_START_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectPopup>
                </Select>
              )}
            />
            <FieldError>{errors.weekStartsOn?.message}</FieldError>
          </Field>
        </SettingsRow>
      </SettingsSection>

      {canEdit ? (
        <div className='grid'>
          <Button loading={isSubmitting} type='submit'>
            Salvar configurações
          </Button>
        </div>
      ) : (
        <p className='text-muted-foreground text-sm'>
          Somente o dono ou um administrador pode alterar as configurações do workspace.
        </p>
      )}
    </form>
  )
}
