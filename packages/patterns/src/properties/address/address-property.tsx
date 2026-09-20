'use client'

import { Button } from '@fifilo/ui/components/button'
import { Input } from '@fifilo/ui/components/input'
import { Popover, PopoverPopup, PopoverTrigger } from '@fifilo/ui/components/popover'
import { cn } from '@fifilo/ui/lib/utils'
import { MapPinIcon } from 'lucide-react'
import { type FormEvent, useEffect, useState } from 'react'
import { IconLabelProperty } from '../icon-label/icon-label-property'
import { PropertySurface, type PropertyVariant } from '../property-surface'
import { PropertyTrigger } from '../property-trigger'

export type BrazilianStateCode = (typeof BRAZILIAN_STATES)[number]

/**
 * The record's address, one part per key. Empty is `null`; an empty part too,
 * because `''` in a postal code is not "no postal code", it is an invalid one.
 */
export interface AddressValue {
  city: string | null
  complement: string | null
  district: string | null
  number: string | null
  postalCode: string | null
  state: BrazilianStateCode | null
  street: string | null
}

export interface AddressPropertyProps {
  value: AddressValue | null
  addLabel?: string
  ariaLabel?: string
  className?: string
  disabled?: boolean
  /**
   * Refusal from the **consumer** — the server that knows the record. Format
   * does not come through here: the popup refuses an invalid postal code and
   * state before the write.
   */
  errorMessage?: string | null
  placeholder?: string
  readOnly?: boolean
  /** The type icon left of the value; a row that is already labelled does not need it. */
  showIcon?: boolean
  variant?: PropertyVariant
  onValueChange?: (value: AddressValue | null) => void
}

const EMPTY: AddressValue = {
  city: null,
  complement: null,
  district: null,
  number: null,
  postalCode: null,
  state: null,
  street: null,
}

const BRAZILIAN_STATES = [
  'AC',
  'AL',
  'AM',
  'AP',
  'BA',
  'CE',
  'DF',
  'ES',
  'GO',
  'MA',
  'MG',
  'MS',
  'MT',
  'PA',
  'PB',
  'PE',
  'PI',
  'PR',
  'RJ',
  'RN',
  'RO',
  'RR',
  'RS',
  'SC',
  'SE',
  'SP',
  'TO',
] as const

const POSTAL_CODE = /^\d{5}-?\d{3}$/

const FIELDS = [
  { key: 'postalCode', label: 'CEP', placeholder: '00000-000' },
  { key: 'street', label: 'Logradouro', placeholder: 'Avenida, rua, travessa…' },
  { key: 'number', label: 'Número', placeholder: '1200' },
  { key: 'complement', label: 'Complemento', placeholder: 'Sala, bloco, andar' },
  { key: 'district', label: 'Bairro', placeholder: 'Aldeota' },
  { key: 'city', label: 'Cidade', placeholder: 'Fortaleza' },
  { key: 'state', label: 'UF', placeholder: 'CE' },
] as const satisfies readonly { key: keyof AddressValue; label: string; placeholder: string }[]

const isStateCode = (code: string): code is BrazilianStateCode =>
  (BRAZILIAN_STATES as readonly string[]).includes(code)

/**
 * What the row reads in one line: city and state identify the record, and that
 * is what one scans for. With no city, the first filled part serves — saying
 * "no address" about a record that has a street would be a lie.
 */
export const addressSummary = (address: AddressValue | null): string | null => {
  if (!address) return null
  if (address.city) return address.state ? `${address.city}, ${address.state}` : address.city
  return address.street ?? address.district ?? address.postalCode ?? address.state ?? null
}

const isEmpty = (address: AddressValue) => Object.values(address).every((part) => part === null)

/**
 * Address as a property, in the same anatomy as `PhoneProperty`: empty, the
 * trigger explains itself; filled, the row reads the summary and opens the same
 * popup.
 *
 * The only format the popup refuses is the one the country defines — postal
 * code and state. Street, number and district have no canonical shape, and
 * demanding one would refuse legitimate addresses.
 */
export function AddressProperty({
  addLabel = 'Adicionar endereço',
  ariaLabel = 'Endereço',
  className,
  disabled = false,
  errorMessage = null,
  onValueChange,
  placeholder = 'Sem endereço',
  readOnly = false,
  showIcon = true,
  value,
  variant = 'plain',
}: Readonly<AddressPropertyProps>) {
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState<AddressValue>(value ?? EMPTY)
  const [errors, setErrors] = useState<Partial<Record<keyof AddressValue, string>>>({})
  const summary = addressSummary(value)

  // Only on opening: a background refetch brings another object in `value`, and
  // reloading the draft there would throw away what the person is typing.
  useEffect(() => {
    if (!open) return
    setDraft(value ?? EMPTY)
    setErrors({})
  }, [open])

  if (readOnly || !onValueChange) {
    return (
      <div
        className={cn('flex min-w-0 flex-wrap gap-1', className)}
        data-slot='address-property'
        data-variant={variant}
      >
        {summary ? (
          <IconLabelProperty
            ariaLabel={ariaLabel}
            icon={showIcon ? MapPinIcon : undefined}
            label={summary}
            variant={variant}
          />
        ) : (
          <PropertySurface muted variant={variant}>
            {placeholder}
          </PropertySurface>
        )}
      </div>
    )
  }

  const save = () => {
    const nextErrors: Partial<Record<keyof AddressValue, string>> = {}
    const postalCode = draft.postalCode?.trim() || null
    const state = draft.state?.trim().toUpperCase() || null

    if (postalCode && !POSTAL_CODE.test(postalCode))
      nextErrors.postalCode = 'Informe um CEP válido.'
    if (state && !isStateCode(state)) nextErrors.state = 'Informe uma UF válida.'

    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) return

    const next: AddressValue = {
      city: draft.city?.trim() || null,
      complement: draft.complement?.trim() || null,
      district: draft.district?.trim() || null,
      number: draft.number?.trim() || null,
      postalCode,
      state: state && isStateCode(state) ? state : null,
      street: draft.street?.trim() || null,
    }
    // A wholly blank address is a removal: storing seven nulls would say an
    // address exists, and it does not.
    onValueChange(isEmpty(next) ? null : next)
    setOpen(false)
  }

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    // The popup is a portal, and a React portal propagates events through the
    // component tree, not the DOM one: without containing it here, saving the
    // address submits the form that composes the property.
    event.stopPropagation()
    save()
  }

  return (
    <div
      className={cn('flex min-w-0 flex-wrap items-center gap-1', className)}
      data-slot='address-property'
      data-variant={variant}
    >
      <Popover onOpenChange={setOpen} open={open}>
        <PopoverTrigger
          render={
            <PropertyTrigger
              aria-label={summary ? `${ariaLabel}: ${summary}` : addLabel}
              muted={!summary}
              render={<button disabled={disabled} type='button' />}
              variant={variant}
            >
              {showIcon ? <MapPinIcon aria-hidden='true' className='size-3.5' /> : null}
              <span className='truncate'>{summary ?? placeholder}</span>
            </PropertyTrigger>
          }
        />
        <PopoverPopup align='start' aria-label={addLabel} className='w-80'>
          {/* `noValidate`: a validação é a nossa, com mensagem em pt-BR junto do
              campo. A do navegador mostraria um balão que não sabemos traduzir. */}
          <form className='grid gap-3 p-1' noValidate onSubmit={submit}>
            {FIELDS.map((field) => (
              <div className='grid gap-1' key={field.key}>
                <span className='font-medium text-muted-foreground text-xs'>{field.label}</span>
                <Input
                  aria-invalid={Boolean(errors[field.key]) || undefined}
                  aria-label={field.label}
                  nativeInput
                  onChange={(event) => {
                    // No trimming here: in a controlled field, trimming on
                    // every keystroke eats the space that is about to become
                    // "Avenida Dom Luís". `save` trims once, at the end.
                    setDraft({ ...draft, [field.key]: event.target.value || null })
                    setErrors({ ...errors, [field.key]: undefined })
                  }}
                  // The Base UI popup closes on `Enter`. Containing the event
                  // in the field itself is what allows saving by keyboard.
                  onKeyDown={(event) => {
                    if (event.key !== 'Enter') return
                    event.preventDefault()
                    event.stopPropagation()
                    save()
                  }}
                  placeholder={field.placeholder}
                  value={draft[field.key] ?? ''}
                />
                {errors[field.key] ? (
                  <p className='text-destructive text-xs' role='alert'>
                    {errors[field.key]}
                  </p>
                ) : null}
              </div>
            ))}
            {errorMessage ? (
              <p className='text-destructive text-xs' role='alert'>
                {errorMessage}
              </p>
            ) : null}
            <div className='flex items-center justify-end'>
              <Button size='sm' type='submit' variant='secondary'>
                Salvar
              </Button>
            </div>
          </form>
        </PopoverPopup>
      </Popover>
    </div>
  )
}
