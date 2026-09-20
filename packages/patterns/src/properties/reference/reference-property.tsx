'use client'

import { BoxIcon, Building2Icon, PackageIcon } from 'lucide-react'
import { IconLabelProperty } from '../icon-label/icon-label-property'
import type { PropertyVariant } from '../property-surface'

export type ReferencePropertyKind = 'account' | 'product' | 'record'

export interface ReferencePropertyProps {
  label: string
  ariaLabel?: string
  className?: string
  kind?: ReferencePropertyKind
  variant?: PropertyVariant
}

const referenceIcon = {
  account: Building2Icon,
  product: PackageIcon,
  record: BoxIcon,
} satisfies Record<ReferencePropertyKind, typeof BoxIcon>

export function ReferenceProperty({
  ariaLabel,
  className,
  kind = 'record',
  label,
  variant = 'badge',
}: Readonly<ReferencePropertyProps>) {
  return (
    <IconLabelProperty
      ariaLabel={ariaLabel}
      className={className}
      icon={referenceIcon[kind]}
      label={label}
      variant={variant}
    />
  )
}
