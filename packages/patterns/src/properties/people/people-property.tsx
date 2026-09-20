'use client'

import { Avatar, AvatarFallback, AvatarImage } from '@fifilo/ui/components/avatar'
import {
  Combobox,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
  ComboboxPopup,
  ComboboxStatus,
  ComboboxTrigger,
} from '@fifilo/ui/components/combobox'
import { cn } from '@fifilo/ui/lib/utils'
import { SearchIcon, UserPlusIcon } from 'lucide-react'
import type React from 'react'
import { useMemo } from 'react'
import { PropertySurface, type PropertyVariant } from '../property-surface'
import { PropertyTrigger } from '../property-trigger'

export interface PeoplePropertyOption<TValue extends string = string> {
  value: TValue
  label: string
  fallback?: string
  imageUrl?: string
  supportingLabel?: string
}

export type PeoplePropertyDropdownPlacement = Pick<
  React.ComponentProps<typeof ComboboxPopup>,
  'align' | 'alignOffset' | 'side' | 'sideOffset'
>

export interface PeoplePropertyActionContext<TValue extends string = string> {
  added: PeoplePropertyOption<TValue> | null
  previousValue: readonly TValue[]
  removed: PeoplePropertyOption<TValue> | null
}

export interface PeoplePropertyProps<TValue extends string = string> {
  value: readonly TValue[]
  options: readonly PeoplePropertyOption<TValue>[]
  action?: (value: readonly TValue[], context: PeoplePropertyActionContext<TValue>) => void
  ariaLabel?: string
  className?: string
  disabled?: boolean
  dropdownPlacement?: PeoplePropertyDropdownPlacement
  isLoading?: boolean
  placeholder?: string
  readOnly?: boolean
  searchPlaceholder?: string
  variant?: PropertyVariant
  onValueChange?: (value: readonly TValue[]) => void
}

/**
 * A single trigger for the whole collection, in the same badge `PersonProperty`
 * draws for a single value: avatar and name of the first one, a count for the
 * rest, and search inside the popup. One chip per person grows in height and
 * takes the row out of vertical alignment with the unit's other properties.
 */
export function PeopleProperty<TValue extends string = string>({
  action,
  ariaLabel = 'Pessoas',
  className,
  disabled = false,
  dropdownPlacement,
  isLoading = false,
  onValueChange,
  options,
  placeholder = 'Adicionar pessoa',
  readOnly = false,
  searchPlaceholder = 'Buscar pessoa…',
  value,
  variant = 'badge',
}: Readonly<PeoplePropertyProps<TValue>>) {
  const selectedOptions = useMemo(
    () =>
      value.map(
        (selectedValue) =>
          options.find((option) => option.value === selectedValue) ?? {
            label: selectedValue,
            value: selectedValue,
          },
      ),
    [options, value],
  )
  const canUpdate = Boolean(action ?? onValueChange)
  const [first, ...rest] = selectedOptions

  if (readOnly || !canUpdate) {
    return (
      <PropertySurface
        aria-label={ariaLabel}
        className={cn('max-w-full', className)}
        data-slot='people-property'
        muted={!first}
        variant={variant}
      >
        <PeopleSummary
          count={rest.length}
          option={first ?? null}
          placeholder={placeholder}
          variant={variant}
        />
      </PropertySurface>
    )
  }

  return (
    <Combobox<PeoplePropertyOption<TValue>, true>
      autoHighlight
      disabled={disabled}
      itemToStringLabel={(option) => option.label}
      itemToStringValue={(option) => option.value}
      items={options}
      multiple
      onValueChange={(nextOptions) => {
        const nextValue = nextOptions.map((option) => option.value)
        const previousValues = new Set(value)
        const nextValues = new Set(nextValue)
        const added = nextOptions.find((option) => !previousValues.has(option.value)) ?? null
        const removed = selectedOptions.find((option) => !nextValues.has(option.value)) ?? null

        if (action) {
          action(nextValue, { added, previousValue: value, removed })
          return
        }
        onValueChange?.(nextValue)
      }}
      value={selectedOptions}
    >
      <ComboboxTrigger
        aria-label={ariaLabel}
        render={<PropertyTrigger className={className} muted={!first} variant={variant} />}
      >
        <PeopleSummary
          count={rest.length}
          option={first ?? null}
          placeholder={placeholder}
          variant={variant}
        />
      </ComboboxTrigger>
      <ComboboxPopup
        {...dropdownPlacement}
        align={dropdownPlacement?.align ?? 'end'}
        aria-label={ariaLabel}
        className='w-64 min-w-0! max-w-[calc(100vw-2rem)]'
      >
        <div className='border-b p-2'>
          <ComboboxInput
            className='rounded-md before:rounded-[calc(var(--radius-md)-1px)]'
            placeholder={searchPlaceholder}
            showTrigger={false}
            startAddon={<SearchIcon />}
          />
        </div>
        {isLoading ? <ComboboxStatus>Carregando pessoas…</ComboboxStatus> : null}
        <ComboboxEmpty>Nenhuma pessoa found.</ComboboxEmpty>
        <ComboboxList>
          {(option) => (
            <ComboboxItem key={option.value} value={option}>
              <PersonContent option={option} />
            </ComboboxItem>
          )}
        </ComboboxList>
      </ComboboxPopup>
    </Combobox>
  )
}

function PeopleSummary<TValue extends string = string>({
  count,
  option,
  placeholder,
  variant,
}: Readonly<{
  count: number
  option: PeoplePropertyOption<TValue> | null
  placeholder: string
  variant: PropertyVariant
}>) {
  if (!option) {
    return (
      <span className='flex min-w-0 items-center gap-1.5'>
        <UserPlusIcon aria-hidden className='size-3' />
        <span className='truncate'>{placeholder}</span>
      </span>
    )
  }

  return (
    <>
      <PersonContent option={option} variant={variant} />
      {count > 0 ? (
        <span className='shrink-0 text-muted-foreground tabular-nums'>+{count}</span>
      ) : null}
    </>
  )
}

function PersonContent<TValue extends string = string>({
  option,
  variant,
}: Readonly<{ option: PeoplePropertyOption<TValue>; variant?: PropertyVariant }>) {
  return (
    <span className='flex min-w-0 items-center gap-1.5'>
      {/* As iniciais são reforço visual; o nome ao lado já nomeia a pessoa. */}
      <Avatar
        aria-hidden='true'
        className={cn(variant === 'plain' ? 'size-7' : 'size-5', 'text-[0.625rem]')}
      >
        {option.imageUrl ? <AvatarImage alt='' src={option.imageUrl} /> : null}
        <AvatarFallback>{option.fallback ?? getInitials(option.label)}</AvatarFallback>
      </Avatar>
      <span className='min-w-0 truncate'>{option.label}</span>
      {option.supportingLabel ? (
        <span className='hidden text-muted-foreground text-xs sm:inline'>
          {option.supportingLabel}
        </span>
      ) : null}
    </span>
  )
}

function getInitials(label: string): string {
  return label
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase()
}
