'use client'

import { Avatar, AvatarFallback, AvatarImage } from '@fifilo/ui/components/avatar'
import { Select, SelectItem, SelectPopup, SelectPrimitive } from '@fifilo/ui/components/select'
import { cn } from '@fifilo/ui/lib/utils'
import { UserIcon, UserPlusIcon } from 'lucide-react'
import { PropertySurface, type PropertyVariant } from '../property-surface'
import { PropertyTrigger } from '../property-trigger'

export interface PersonPropertyOption<TValue extends string = string> {
  value: TValue
  label: string
  fallback?: string
  imageUrl?: string
  supportingLabel?: string
}

export type PersonPropertyDropdownPlacement = Pick<
  React.ComponentProps<typeof SelectPopup>,
  'align' | 'alignItemWithTrigger' | 'alignOffset' | 'side' | 'sideOffset'
>

export interface PersonPropertyActionContext<TValue extends string = string> {
  option: PersonPropertyOption<TValue>
  previousValue: TValue | null
}

export interface PersonPropertyProps<TValue extends string = string> {
  value: TValue | null
  options: readonly PersonPropertyOption<TValue>[]
  action?: (value: TValue, context: PersonPropertyActionContext<TValue>) => void
  ariaLabel?: string
  className?: string
  disabled?: boolean
  display?: 'avatar' | 'full'
  dropdownPlacement?: PersonPropertyDropdownPlacement
  placeholder?: string
  readOnly?: boolean
  variant?: PropertyVariant
  onValueChange?: (value: TValue) => void
}

export function PersonProperty<TValue extends string = string>({
  action,
  ariaLabel,
  className,
  disabled = false,
  display = 'full',
  dropdownPlacement,
  onValueChange,
  options,
  placeholder = 'Sem responsável',
  readOnly = false,
  value,
  variant = 'badge',
}: Readonly<PersonPropertyProps<TValue>>) {
  const selectedOption = value ? findPersonOption(options, value) : null
  const accessibleLabel = ariaLabel ?? 'Person'
  const canUpdate = Boolean(action ?? onValueChange)

  if (readOnly || !canUpdate) {
    return (
      <PersonPropertyBadge
        ariaLabel={`${accessibleLabel}: ${selectedOption?.label ?? placeholder}`}
        className={className}
        display={display}
        option={selectedOption}
        placeholder={placeholder}
        variant={variant}
      />
    )
  }

  return (
    <Select
      itemToStringLabel={(option) => option.label}
      itemToStringValue={(option) => option.value}
      items={options}
      onValueChange={(option) => {
        if (option && option.value !== value) {
          if (action) {
            action(option.value, {
              option,
              previousValue: value,
            })
            return
          }
          onValueChange?.(option.value)
        }
      }}
      value={selectedOption}
    >
      <SelectPrimitive.Trigger
        aria-label={`${accessibleLabel}: ${selectedOption?.label ?? placeholder}`}
        disabled={disabled}
        render={<PropertyTrigger className={className} muted={!selectedOption} variant={variant} />}
      >
        <PersonPropertyContent
          display={display}
          option={selectedOption}
          placeholder={placeholder}
          variant={variant}
        />
      </SelectPrimitive.Trigger>
      <SelectPopup {...dropdownPlacement}>
        {options.map((option) => (
          <SelectItem
            aria-label={option.label}
            key={option.value}
            showIndicator={false}
            value={option}
          >
            <PersonPropertyContent option={option} placeholder={placeholder} variant={variant} />
          </SelectItem>
        ))}
      </SelectPopup>
    </Select>
  )
}

export function PersonPropertyBadge<TValue extends string = string>({
  ariaLabel,
  className,
  display = 'full',
  option,
  placeholder = 'Sem responsável',
  variant = 'badge',
}: Readonly<{
  ariaLabel?: string
  className?: string
  display?: 'avatar' | 'full'
  option: PersonPropertyOption<TValue> | null
  placeholder?: string
  variant?: PropertyVariant
}>) {
  return (
    <PropertySurface
      aria-label={ariaLabel}
      className={cn('max-w-full', className)}
      muted={!option}
      variant={variant}
    >
      <PersonPropertyContent
        display={display}
        option={option}
        placeholder={placeholder}
        variant={variant}
      />
    </PropertySurface>
  )
}

function PersonPropertyContent<TValue extends string = string>({
  display,
  option,
  placeholder,
  variant,
}: Readonly<{
  display?: 'avatar' | 'full'
  option: PersonPropertyOption<TValue> | null
  placeholder: string
  variant: PropertyVariant
}>) {
  if (display === 'avatar') {
    return (
      <Avatar className='size-7 border bg-muted text-[0.625rem]'>
        {option?.imageUrl ? <AvatarImage alt='' src={option.imageUrl} /> : null}
        <AvatarFallback className='text-muted-foreground'>
          {option ? (
            (option.fallback ?? getInitials(option.label))
          ) : (
            <UserIcon aria-hidden className='size-3' />
          )}
        </AvatarFallback>
      </Avatar>
    )
  }

  if (!option) {
    return (
      <span className='flex min-w-0 items-center gap-1.5'>
        <UserPlusIcon aria-hidden className='size-3' />
        <span className='truncate'>{placeholder}</span>
      </span>
    )
  }

  return (
    <span className='flex min-w-0 items-center gap-1.5'>
      <Avatar className={cn(variant === 'badge' ? 'size-5' : 'size-7', 'text-[0.625rem]')}>
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

function findPersonOption<TValue extends string>(
  options: readonly PersonPropertyOption<TValue>[],
  value: TValue,
): PersonPropertyOption<TValue> {
  const selectedOption = options.find((option) => option.value === value)
  if (selectedOption) return selectedOption
  return {
    label: value,
    value,
  }
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
