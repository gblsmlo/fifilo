'use client'

import {
  PersonProperty,
  PersonPropertyBadge,
  type PersonPropertyDropdownPlacement,
  type PersonPropertyOption,
} from '../person'
import type { PropertyVariant } from '../property-surface'

export type AssignedPropertyOption<TValue extends string = string> = PersonPropertyOption<TValue>
export type AssignedPropertyDropdownPlacement = PersonPropertyDropdownPlacement

export interface AssignedPropertyActionContext<TValue extends string = string> {
  option: AssignedPropertyOption<TValue>
  previousValue: TValue | null
}

export interface AssignedPropertyProps<TValue extends string = string> {
  value: TValue | null
  options: readonly AssignedPropertyOption<TValue>[]
  action?: (value: TValue, context: AssignedPropertyActionContext<TValue>) => void
  ariaLabel?: string
  className?: string
  disabled?: boolean
  dropdownPlacement?: AssignedPropertyDropdownPlacement
  placeholder?: string
  readOnly?: boolean
  variant?: PropertyVariant
  onValueChange?: (value: TValue) => void
}

export function AssignedProperty<TValue extends string = string>({
  action,
  ariaLabel = 'Responsável',
  dropdownPlacement,
  options,
  placeholder = 'Sem responsável',
  ...props
}: Readonly<AssignedPropertyProps<TValue>>) {
  return (
    <PersonProperty
      action={action}
      ariaLabel={ariaLabel}
      dropdownPlacement={dropdownPlacement}
      options={options}
      placeholder={placeholder}
      {...props}
    />
  )
}

export function AssignedPropertyBadge<TValue extends string = string>({
  className,
  option,
  placeholder = 'Sem responsável',
}: Readonly<{
  className?: string
  option: AssignedPropertyOption<TValue> | null
  placeholder?: string
}>) {
  return <PersonPropertyBadge className={className} option={option} placeholder={placeholder} />
}
