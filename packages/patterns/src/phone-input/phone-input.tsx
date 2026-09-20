'use client'

import {
  Combobox,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
  ComboboxPopup,
  ComboboxSeparator,
  ComboboxTrigger,
  useComboboxFilter,
} from '@fifilo/ui/components/combobox'
import { FieldPrimitive } from '@fifilo/ui/components/field'
import { InputGroup, InputGroupAddon, InputGroupInput } from '@fifilo/ui/components/input-group'
import { ChevronDownIcon, GlobeIcon, SearchIcon } from 'lucide-react'
import type React from 'react'
import { useCallback, useRef, useState } from 'react'
import PhoneNumberInput from 'react-phone-number-input/input-max'
import {
  type PhoneCountry,
  type PhoneCountryCode,
  findPhoneCountry,
  phoneCountries,
} from './countries'
import { defaultPhoneCountry, nationalDigits, phoneNumberCountry } from './phone-number'

export interface PhoneInputProps {
  /** Number in E.164 (`+5511987654321`), or `null` while nobody has typed anything. */
  value: string | null
  onValueChange: (value: string | null) => void
  /** Accessible name of the field, when it is not inside a labelled `<Field>`. */
  ariaLabel?: string
  className?: string
  /** Country assumed for a number typed in national format. */
  defaultCountry?: PhoneCountryCode
  disabled?: boolean
  invalid?: boolean
  name?: string
  placeholder?: string
  readOnly?: boolean
  required?: boolean
  onBlur?: React.FocusEventHandler<HTMLInputElement>
  /**
   * A keystroke in the number field, not in the country selector.
   *
   * It exists for whoever mounts the field inside a surface that reacts to the
   * same keys — the Base UI popup closes on `Enter`, and confirming by keyboard
   * requires containing the event here, before it bubbles.
   */
  onKeyDown?: React.KeyboardEventHandler<HTMLInputElement>
}

/**
 * International phone field: a country selector with flag and dialing code, and
 * an input that formats the number in the country's pattern while the person
 * types. The value that comes out is always E.164, the same format
 * `phoneNumberSchema` validates.
 */
export function PhoneInput({
  ariaLabel,
  className,
  defaultCountry = defaultPhoneCountry,
  disabled = false,
  invalid = false,
  name,
  onBlur,
  onKeyDown,
  onValueChange,
  placeholder,
  readOnly = false,
  required = false,
  value,
}: Readonly<PhoneInputProps>) {
  const fieldRef = useRef<HTMLFieldSetElement>(null)
  const [chosenCountry, setChosenCountry] = useState<PhoneCountryCode>(defaultCountry)

  // The country the number itself declares beats the stored choice: handing the
  // library a country that does not match the value makes it complain about the
  // mismatch, and the flag would lie about what is written in the field.
  const country = findPhoneCountry(phoneNumberCountry(value) ?? chosenCountry)

  const filter = useComboboxFilter({ sensitivity: 'base' })
  const matchesQuery = useCallback(
    (item: PhoneCountry, query: string) => {
      const digits = query.replace(/\D/g, '')
      return (
        filter.contains(item.name, query) || (digits !== '' && item.callingCode.startsWith(digits))
      )
    },
    [filter],
  )

  const selectCountry = (next: PhoneCountry | null) => {
    if (!next || next.code === country.code) return
    setChosenCountry(next.code)
    // Switching country rewrites the dialing code and preserves what has already
    // been typed, so the choice does not cost the whole number.
    const digits = nationalDigits(value)
    onValueChange(digits === '' ? null : `+${next.callingCode}${digits}`)
  }

  return (
    <InputGroup className={className} data-slot='phone-input' ref={fieldRef}>
      {/*
        Sem um Field próprio, o Field do consumer adota o seletor de país como
        controle dele: o gatilho passa a se anunciar com o rótulo, a descrição
        e o erro do telefone, e perde o próprio nome.
      */}
      <FieldPrimitive.Root render={<span className='contents' />}>
        <InputGroupAddon align='inline-start'>
          <Combobox
            filter={matchesQuery}
            items={phoneCountries}
            itemToStringLabel={(item: PhoneCountry) => item.name}
            onValueChange={selectCountry}
            value={country}
          >
            <ComboboxTrigger
              aria-label={`País: ${country.name}`}
              className='flex cursor-pointer items-center gap-1.5 rounded-md px-1 py-0.5 outline-none transition-colors hover:bg-accent focus-visible:ring-[3px] focus-visible:ring-ring/24 disabled:cursor-default disabled:hover:bg-transparent'
              disabled={disabled || readOnly}
            >
              <PhoneCountryFlag country={country} />
              <span className='text-base text-muted-foreground tabular-nums sm:text-sm'>
                +{country.callingCode}
              </span>
              <ChevronDownIcon aria-hidden='true' className='size-3.5 opacity-80' />
            </ComboboxTrigger>
            {/*
              Ancorado no campo inteiro, não no gatilho: `--anchor-width` passa a
              ser a largura do telefone, e o dropdown acompanha o campo em
              qualquer wrapper em vez de carregar uma largura fixa.
            */}
            <ComboboxPopup
              align='start'
              anchor={fieldRef}
              aria-label='Selecionar país'
              className='w-(--anchor-width) min-w-64'
            >
              {/* Achatado como o `CommandInput`: a moldura é do popup, não do campo. */}
              <ComboboxInput
                aria-label='Buscar país'
                className='border-transparent! bg-transparent! shadow-none before:hidden has-focus-visible:ring-0'
                placeholder='Buscar país'
                showTrigger={false}
                startAddon={<SearchIcon />}
              />
              <ComboboxSeparator className='mx-0 my-0' />
              <ComboboxEmpty>Nenhum país encontrado.</ComboboxEmpty>
              <ComboboxList>
                {(item: PhoneCountry) => (
                  <ComboboxItem key={item.code} value={item}>
                    <span className='flex w-full min-w-0 items-center gap-2'>
                      <PhoneCountryFlag country={item} />
                      <span className='min-w-0 truncate'>{item.name}</span>
                      <span className='ms-auto shrink-0 text-muted-foreground tabular-nums'>
                        +{item.callingCode}
                      </span>
                    </span>
                  </ComboboxItem>
                )}
              </ComboboxList>
            </ComboboxPopup>
          </Combobox>
          <span aria-hidden='true' className='h-4 w-px bg-input' />
        </InputGroupAddon>
      </FieldPrimitive.Root>
      <PhoneNumberInput
        aria-invalid={invalid || undefined}
        aria-label={ariaLabel}
        autoComplete='tel'
        country={country.code}
        disabled={disabled}
        inputComponent={PhoneNumberField}
        name={name}
        onBlur={onBlur}
        onChange={(next) => onValueChange(next ?? null)}
        onKeyDown={onKeyDown}
        placeholder={placeholder}
        readOnly={readOnly}
        required={required}
        value={value ?? undefined}
      />
    </InputGroup>
  )
}

/** Ponte entre o `inputComponent` que a biblioteca espera e o input do design system. */
function PhoneNumberField({ ref, ...props }: React.ComponentProps<'input'>) {
  return <InputGroupInput ref={ref} {...props} />
}

function PhoneCountryFlag({ country }: Readonly<{ country: PhoneCountry }>) {
  const Flag = country.flag

  return (
    <span
      aria-hidden='true'
      className='block w-5 shrink-0 overflow-hidden rounded-xs [&>svg]:block [&>svg]:h-auto [&>svg]:w-full'
    >
      {Flag ? <Flag title={country.name} /> : <GlobeIcon />}
    </span>
  )
}
