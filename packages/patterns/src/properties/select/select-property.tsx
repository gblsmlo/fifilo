'use client'

import { Button } from '@fifilo/ui/components/button'
import {
  Combobox,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
  ComboboxPopup,
  ComboboxTrigger,
} from '@fifilo/ui/components/combobox'
import {
  Select,
  SelectGroup,
  SelectGroupLabel,
  SelectItem,
  SelectPopup,
  SelectPrimitive,
} from '@fifilo/ui/components/select'
import { cn } from '@fifilo/ui/lib/utils'
import { PlusIcon, SearchIcon } from 'lucide-react'
import type React from 'react'
import { type PropertyIcon, type PropertyTone, propertyToneClassName } from '../property-catalog'
import { PropertySurface, type PropertyVariant } from '../property-surface'
import { PropertyTrigger } from '../property-trigger'

export interface SelectPropertyOption {
  label: string
  value: string
  icon?: PropertyIcon
  tone?: PropertyTone
}

export interface SelectPropertyGroup {
  label: string
  options: readonly SelectPropertyOption[]
}

export type SelectPropertyDropdownPlacement = Pick<
  React.ComponentProps<typeof SelectPopup>,
  'align' | 'alignItemWithTrigger' | 'alignOffset' | 'side' | 'sideOffset'
>

export interface SelectPropertyActionContext {
  previousValue: string | null
}

/**
 * A command in the popup footer, below the list: it reaches what the catalog
 * does not have yet. It is not an option — it does not enter the search and does
 * not become a value when chosen.
 */
export interface SelectPropertyFooterAction {
  label: string
  disabled?: boolean
  icon?: PropertyIcon
  onSelect?: () => void
}

interface SelectPropertyBaseProps {
  /**
   * Accessible name. Required: unlike Status or Priority, this property has no
   * domain of its own to derive a label from.
   */
  ariaLabel: string
  /** `null` is the absence of a choice, and the surface shows the `placeholder`. */
  value: string | null
  action?: (value: string | null, context: SelectPropertyActionContext) => void
  className?: string
  disabled?: boolean
  dropdownPlacement?: SelectPropertyDropdownPlacement
  /**
   * Label for the absent value. It names the property — that is what makes clear
   * what the pill represents when nobody has chosen anything yet.
   */
  placeholder?: string
  /** Label when the current value is not in the catalog received. */
  fallback?: string
  /**
   * Offers the option of going back to "no value" inside the dropdown. With
   * search it is an option like the others, and the filter reaches it.
   */
  emptyOptionLabel?: string
  readOnly?: boolean
  /**
   * Turns on search inside the popup, for the catalog that cannot be read at
   * once. The filtered list is flat: with `groups`, the section labels do not show.
   */
  searchPlaceholder?: string
  /** Message when the search finds nothing. */
  searchEmptyLabel?: string
  footerAction?: SelectPropertyFooterAction
  variant?: PropertyVariant
  onValueChange?: (value: string | null) => void
}

/**
 * The catalog arrives flat or split into named sections — never both ways.
 * `groups` exists for the list that needs to say where the options come from;
 * the absent-value option stays outside the sections, because it belongs to none.
 */
export type SelectPropertyItems =
  | { groups?: undefined; options: readonly SelectPropertyOption[] }
  | { groups: readonly SelectPropertyGroup[]; options?: undefined }

export type SelectPropertyProps = SelectPropertyBaseProps & SelectPropertyItems

/**
 * The closed-catalog property the consumer defines. `StatusProperty` and
 * `PriorityProperty` bring their own catalog because the vocabulary is theirs;
 * here the options come from outside, so the pattern serves any domain
 * enumeration without carrying its vocabulary.
 */
export function SelectProperty({
  action,
  ariaLabel,
  className,
  disabled = false,
  dropdownPlacement,
  emptyOptionLabel,
  fallback = '—',
  footerAction,
  groups,
  onValueChange,
  options,
  placeholder,
  readOnly = false,
  searchEmptyLabel = 'Nenhuma opção encontrada.',
  searchPlaceholder,
  value,
  variant = 'badge',
}: Readonly<SelectPropertyProps>) {
  const catalog = groups ? groups.flatMap((group) => group.options) : options
  const selectedOption = value === null ? undefined : catalog.find((o) => o.value === value)
  const canUpdate = Boolean(action ?? onValueChange)
  // With no value the label names the property; with a value outside the
  // catalog, the fallback warns there is something this list cannot represent.
  const currentLabel =
    selectedOption?.label ?? (value === null ? (placeholder ?? fallback) : fallback)
  // With no value, the accessible name is the property itself: "Tipo: Tipo"
  // says nothing to a listener.
  const accessibleLabel = value === null ? ariaLabel : `${ariaLabel}: ${currentLabel}`
  const emptyOption: SelectPropertyOption | null = emptyOptionLabel
    ? { label: emptyOptionLabel, value: '' }
    : null
  const items = emptyOption ? [emptyOption, ...catalog] : catalog

  if (readOnly || !canUpdate) {
    return (
      <PropertySurface
        aria-label={accessibleLabel}
        className={cn('max-w-full', className)}
        muted={value === null}
        role='img'
        variant={variant}
      >
        <SelectPropertyContent label={currentLabel} option={selectedOption} />
      </PropertySurface>
    )
  }

  const commit = (option: SelectPropertyOption | null) => {
    if (!option) return
    const next = option.value === '' ? null : option.value
    if (next === value) return
    if (action) {
      action(next, { previousValue: value })
      return
    }
    onValueChange?.(next)
  }

  const trigger = <SelectPropertyContent label={currentLabel} option={selectedOption} />

  const footer = footerAction ? (
    <div className='border-t p-1'>
      <Button
        className='w-full justify-start'
        disabled={footerAction.disabled}
        onClick={footerAction.onSelect}
        type='button'
        variant='ghost'
      >
        {footerAction.icon ? <footerAction.icon aria-hidden /> : <PlusIcon aria-hidden />}
        {footerAction.label}
      </Button>
    </div>
  ) : null

  if (searchPlaceholder) {
    return (
      <Combobox<SelectPropertyOption>
        autoHighlight
        disabled={disabled}
        itemToStringLabel={(option) => option.label}
        itemToStringValue={(option) => option.value}
        items={items as SelectPropertyOption[]}
        onValueChange={commit}
        value={selectedOption ?? emptyOption}
      >
        <ComboboxTrigger
          aria-label={accessibleLabel}
          render={
            <PropertyTrigger className={className} muted={value === null} variant={variant} />
          }
        >
          {trigger}
        </ComboboxTrigger>
        <ComboboxPopup
          align={dropdownPlacement?.align}
          alignOffset={dropdownPlacement?.alignOffset}
          aria-label={ariaLabel}
          className='w-56 min-w-0! max-w-[calc(100vw-2rem)]'
          side={dropdownPlacement?.side}
          sideOffset={dropdownPlacement?.sideOffset}
        >
          <div className='border-b p-2'>
            <ComboboxInput
              className='rounded-md before:rounded-[calc(var(--radius-md)-1px)]'
              placeholder={searchPlaceholder}
              showTrigger={false}
              startAddon={<SearchIcon />}
            />
          </div>
          <ComboboxEmpty>{searchEmptyLabel}</ComboboxEmpty>
          <ComboboxList>
            {(option: SelectPropertyOption) => (
              <ComboboxItem key={option.value} value={option}>
                <SelectPropertyContent label={option.label} option={option} />
              </ComboboxItem>
            )}
          </ComboboxList>
          {footer}
        </ComboboxPopup>
      </Combobox>
    )
  }

  return (
    <Select
      itemToStringLabel={(option) => option.label}
      itemToStringValue={(option) => option.value}
      items={items as SelectPropertyOption[]}
      onValueChange={commit}
      value={selectedOption ?? emptyOption}
    >
      <SelectPrimitive.Trigger
        aria-label={accessibleLabel}
        disabled={disabled}
        render={<PropertyTrigger className={className} muted={value === null} variant={variant} />}
      >
        {trigger}
      </SelectPrimitive.Trigger>
      <SelectPopup {...dropdownPlacement}>
        {emptyOption ? (
          <SelectItem showIndicator={false} value={emptyOption}>
            <SelectPropertyContent label={emptyOption.label} option={undefined} />
          </SelectItem>
        ) : null}
        {groups
          ? groups.map((group) => (
              <SelectGroup key={group.label}>
                <SelectGroupLabel>{group.label}</SelectGroupLabel>
                {group.options.map((option) => (
                  <SelectItem key={option.value} showIndicator={false} value={option}>
                    <SelectPropertyContent label={option.label} option={option} />
                  </SelectItem>
                ))}
              </SelectGroup>
            ))
          : catalog.map((option) => (
              <SelectItem key={option.value} showIndicator={false} value={option}>
                <SelectPropertyContent label={option.label} option={option} />
              </SelectItem>
            ))}
        {footer}
      </SelectPopup>
    </Select>
  )
}

function SelectPropertyContent({
  label,
  option,
}: Readonly<{ label: string; option?: SelectPropertyOption }>) {
  const Icon = option?.icon

  return (
    <span className='flex min-w-0 items-center gap-1.5'>
      {Icon ? (
        <Icon
          aria-hidden
          className={cn('size-3', option?.tone ? propertyToneClassName[option.tone] : undefined)}
        />
      ) : null}
      <span className='truncate'>{label}</span>
    </span>
  )
}
