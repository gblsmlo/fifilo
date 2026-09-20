'use client'

import { Select, SelectItem, SelectPopup, SelectPrimitive } from '@fifilo/ui/components/select'
import { cn } from '@fifilo/ui/lib/utils'
import { FlagIcon, MoreHorizontalIcon } from 'lucide-react'
import type React from 'react'
import { type PropertyPreset, propertyToneClassName } from '../property-catalog'
import { PropertySurface, type PropertyVariant } from '../property-surface'
import { PropertyTrigger } from '../property-trigger'

export type PriorityPropertyValue = 'no_priority' | 'urgent' | 'high' | 'medium' | 'low'

type PriorityPropertyPreset = PropertyPreset<PriorityPropertyValue>

export type PriorityPropertyDropdownPlacement = Pick<
  React.ComponentProps<typeof SelectPopup>,
  'align' | 'alignItemWithTrigger' | 'alignOffset' | 'side' | 'sideOffset'
>

export interface PriorityPropertyActionContext {
  previousValue: PriorityPropertyValue | null
}

const priorityPropertyCatalog: Record<PriorityPropertyValue, PriorityPropertyPreset> = {
  high: {
    icon: FlagIcon,
    label: 'Alta',
    tone: 'warning',
    value: 'high',
  },
  low: {
    icon: FlagIcon,
    label: 'Baixa',
    tone: 'neutral',
    value: 'low',
  },
  medium: {
    icon: FlagIcon,
    label: 'Média',
    tone: 'info',
    value: 'medium',
  },
  no_priority: {
    icon: MoreHorizontalIcon,
    label: 'Sem prioridade',
    tone: 'neutral',
    value: 'no_priority',
  },
  urgent: {
    icon: FlagIcon,
    label: 'Urgente',
    tone: 'danger',
    value: 'urgent',
  },
}

const priorityPropertyValues = [
  'no_priority',
  'urgent',
  'high',
  'medium',
  'low',
] as const satisfies readonly PriorityPropertyValue[]

const priorityPropertyRestValue = 'no_priority' satisfies PriorityPropertyValue

export interface PriorityPropertyProps {
  value: PriorityPropertyValue | null
  action?: (value: PriorityPropertyValue, context: PriorityPropertyActionContext) => void
  ariaLabel?: string
  className?: string
  disabled?: boolean
  dropdownPlacement?: PriorityPropertyDropdownPlacement
  hideLabel?: boolean
  includeNoPriority?: boolean
  readOnly?: boolean
  variant?: PropertyVariant
  onValueChange?: (value: PriorityPropertyValue) => void
}

export function PriorityProperty({
  action,
  ariaLabel,
  className,
  disabled = false,
  dropdownPlacement,
  hideLabel = false,
  includeNoPriority = true,
  onValueChange,
  readOnly = false,
  value,
  variant = 'badge',
}: Readonly<PriorityPropertyProps>) {
  const values = includeNoPriority
    ? priorityPropertyValues
    : priorityPropertyValues.filter((option) => option !== 'no_priority')
  const options = values.map((optionValue) => priorityPropertyCatalog[optionValue])
  const selectedOption = priorityPropertyCatalog[value ?? priorityPropertyRestValue]
  const propertyLabel = ariaLabel ?? 'Priority'
  const accessibleLabel =
    value === null ? propertyLabel : `${propertyLabel}: ${selectedOption.label}`
  const canUpdate = Boolean(action ?? onValueChange)

  if (readOnly || !canUpdate) {
    return (
      <PriorityPropertyBadge
        accessibleLabel={ariaLabel ? accessibleLabel : undefined}
        className={className}
        hideLabel={hideLabel}
        value={value}
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
              previousValue: value,
            })
            return
          }
          onValueChange?.(option.value)
        }
      }}
      value={value === null ? null : selectedOption}
    >
      <SelectPrimitive.Trigger
        aria-label={accessibleLabel}
        disabled={disabled}
        render={<PropertyTrigger className={className} muted={value === null} variant={variant} />}
      >
        <PriorityPropertyContent hideLabel={hideLabel} option={selectedOption} />
      </SelectPrimitive.Trigger>
      <SelectPopup {...dropdownPlacement}>
        {options.map((option) => (
          <SelectItem key={option.value} showIndicator={false} value={option}>
            <PriorityPropertyContent option={option} />
          </SelectItem>
        ))}
      </SelectPopup>
    </Select>
  )
}

function PriorityPropertyBadge({
  accessibleLabel,
  className,
  hideLabel,
  value,
  variant,
}: Readonly<{
  accessibleLabel?: string
  className?: string
  hideLabel?: boolean
  value: PriorityPropertyValue | null
  variant: PropertyVariant
}>) {
  return (
    <PropertySurface
      aria-label={accessibleLabel}
      className={cn('max-w-full', className)}
      muted={value === null}
      variant={variant}
    >
      <PriorityPropertyContent
        hideLabel={hideLabel}
        option={priorityPropertyCatalog[value ?? priorityPropertyRestValue]}
      />
    </PropertySurface>
  )
}

function PriorityPropertyContent({
  hideLabel = false,
  option,
}: Readonly<{ hideLabel?: boolean; option: PriorityPropertyPreset }>) {
  const Icon = option.icon
  return (
    <span className='flex min-w-0 items-center gap-1.5'>
      <Icon aria-hidden className={cn('size-3', propertyToneClassName[option.tone])} />
      <span className={hideLabel ? 'sr-only' : 'truncate'}>{option.label}</span>
    </span>
  )
}
