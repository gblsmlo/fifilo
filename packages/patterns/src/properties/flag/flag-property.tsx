'use client'

import { IconLabelProperty, type IconLabelPropertyIcon } from '../icon-label/icon-label-property'
import type { PropertyVariant } from '../property-surface'

export type FlagPropertyIcon = IconLabelPropertyIcon

export interface FlagPropertyProps {
  active: boolean
  label: string
  activeIcon?: FlagPropertyIcon
  ariaLabel?: string
  className?: string
  iconClassName?: string
  inactiveLabel?: string
  inactiveIcon?: FlagPropertyIcon
  showInactive?: boolean
  variant?: PropertyVariant
}

export function FlagProperty({
  active,
  activeIcon,
  ariaLabel,
  className,
  iconClassName,
  inactiveIcon,
  inactiveLabel,
  label,
  showInactive = false,
  variant = 'badge',
}: Readonly<FlagPropertyProps>) {
  if (!active && !showInactive) return null

  return (
    <IconLabelProperty
      ariaLabel={ariaLabel}
      className={className}
      icon={active ? activeIcon : inactiveIcon}
      iconClassName={iconClassName}
      label={active ? label : (inactiveLabel ?? label)}
      variant={variant}
    />
  )
}
