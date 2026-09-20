'use client'

import { Select, SelectItem, SelectPopup, SelectPrimitive } from '@fifilo/ui/components/select'
import { cn } from '@fifilo/ui/lib/utils'
import {
  CircleCheckIcon,
  CircleDashedIcon,
  CircleDotDashedIcon,
  CircleDotIcon,
  CircleIcon,
  CircleMinusIcon,
  CircleSlashIcon,
} from 'lucide-react'
import type React from 'react'
import { type PropertyPreset, propertyToneClassName } from '../property-catalog'
import { PropertySurface, type PropertyVariant } from '../property-surface'
import { PropertyTrigger } from '../property-trigger'

export type StatusPropertyValue =
  | 'backlog'
  | 'todo'
  | 'inProgress'
  | 'review'
  | 'done'
  | 'canceled'
  | 'blocked'

type StatusPropertyPreset = PropertyPreset<StatusPropertyValue>

const statusPropertyCatalog: Record<StatusPropertyValue, StatusPropertyPreset> = {
  backlog: {
    icon: CircleDashedIcon,
    label: 'Planejada',
    tone: 'neutral',
    value: 'backlog',
  },
  blocked: {
    icon: CircleMinusIcon,
    label: 'Bloqueada',
    tone: 'danger',
    value: 'blocked',
  },
  canceled: {
    icon: CircleSlashIcon,
    label: 'Cancelada',
    tone: 'neutral',
    value: 'canceled',
  },
  done: {
    icon: CircleCheckIcon,
    label: 'Concluída',
    tone: 'success',
    value: 'done',
  },
  inProgress: {
    icon: CircleDotIcon,
    label: 'Em andamento',
    tone: 'info',
    value: 'inProgress',
  },
  review: {
    icon: CircleDotDashedIcon,
    label: 'Em revisão',
    tone: 'warning',
    value: 'review',
  },
  todo: {
    icon: CircleIcon,
    label: 'Pendente',
    tone: 'warning',
    value: 'todo',
  },
}

const statusPropertyValues = [
  'backlog',
  'todo',
  'inProgress',
  'review',
  'done',
  'canceled',
  'blocked',
] as const satisfies readonly StatusPropertyValue[]

const statusPropertyRestValue = 'backlog' satisfies StatusPropertyValue

export type StatusPropertyDropdownPlacement = Pick<
  React.ComponentProps<typeof SelectPopup>,
  'align' | 'alignItemWithTrigger' | 'alignOffset' | 'side' | 'sideOffset'
>

export interface StatusPropertyActionContext {
  previousValue: StatusPropertyValue | null
}

export interface StatusPropertyProps {
  value: StatusPropertyValue | null
  action?: (value: StatusPropertyValue, context: StatusPropertyActionContext) => void
  ariaLabel?: string
  className?: string
  disabled?: boolean
  dropdownPlacement?: StatusPropertyDropdownPlacement
  readOnly?: boolean
  variant?: PropertyVariant
  values?: readonly StatusPropertyValue[]
  onValueChange?: (value: StatusPropertyValue) => void
}

export function StatusProperty({
  action,
  ariaLabel,
  className,
  disabled = false,
  dropdownPlacement,
  onValueChange,
  readOnly = false,
  value,
  variant = 'badge',
  values = statusPropertyValues,
}: Readonly<StatusPropertyProps>) {
  const options = values.map((optionValue) => statusPropertyCatalog[optionValue])
  const selectedOption = statusPropertyCatalog[value ?? statusPropertyRestValue]
  const propertyLabel = ariaLabel ?? 'Status'
  const accessibleLabel =
    value === null ? propertyLabel : `${propertyLabel}: ${selectedOption.label}`
  const canUpdate = Boolean(action ?? onValueChange)

  if (readOnly || !canUpdate) {
    return (
      <StatusPropertyBadge
        accessibleLabel={ariaLabel ? accessibleLabel : undefined}
        className={className}
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
        <StatusPropertyContent preset={selectedOption} />
      </SelectPrimitive.Trigger>
      <SelectPopup {...dropdownPlacement}>
        {options.map((option) => (
          <SelectItem key={option.value} showIndicator={false} value={option}>
            <StatusPropertyContent preset={option} />
          </SelectItem>
        ))}
      </SelectPopup>
    </Select>
  )
}

function StatusPropertyBadge({
  accessibleLabel,
  className,
  value,
  variant,
}: Readonly<{
  accessibleLabel?: string
  className?: string
  value: StatusPropertyValue | null
  variant: PropertyVariant
}>) {
  return (
    <PropertySurface
      aria-label={accessibleLabel}
      className={cn('max-w-full', className)}
      muted={value === null}
      variant={variant}
    >
      <StatusPropertyContent preset={statusPropertyCatalog[value ?? statusPropertyRestValue]} />
    </PropertySurface>
  )
}

function StatusPropertyContent({ preset }: Readonly<{ preset: StatusPropertyPreset }>) {
  const Icon = preset.icon
  return (
    <span className='flex min-w-0 items-center gap-1.5'>
      <Icon aria-hidden className={cn('size-3', propertyToneClassName[preset.tone])} />
      <span className='truncate'>{preset.label}</span>
    </span>
  )
}
