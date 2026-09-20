'use client'

import { cn } from '@fifilo/ui/lib/utils'
import type React from 'react'
import type { ReactNode } from 'react'
import {
  PropertySurface,
  type PropertySurfaceProps,
  type PropertyVariant,
} from '../property-surface'

export type IconLabelPropertyIcon = React.ComponentType<React.SVGProps<SVGSVGElement>>

export type IconLabelPropertyTrailingVisibility = 'always' | 'hover'

export interface IconLabelPropertyProps {
  label: ReactNode
  ariaLabel?: string
  className?: string
  icon?: IconLabelPropertyIcon
  iconClassName?: string
  leading?: ReactNode
  /** The surface shows absence, not a value: the text falls back to the secondary tone. */
  muted?: boolean
  render?: PropertySurfaceProps['render']
  trailing?: ReactNode
  /**
   * `hover` holds the affordance back until the pointer arrives. In a sidebar
   * where every row offers the same action, the repeated icons compete with the
   * values for attention. The space stays reserved — it is opacity, not removal —
   * so the row does not jump; focus and a coarse pointer reveal it without hover.
   */
  trailingVisibility?: IconLabelPropertyTrailingVisibility
  variant?: PropertyVariant
}

/**
 * The base shared by every property made of an optional icon plus a truncated
 * label: `TextProperty`, `FlagProperty` and `ReferenceProperty` each rendered
 * this same shape with a copy of their own. What changes between them is where
 * the icon and the label come from — a closed catalog, an on/off boolean, a
 * nullable value — not the surface.
 *
 * `leading` and `trailing` open both sides to content that is not a catalog icon
 * (avatar, action affordance, copy indicator); `render` swaps the root element
 * when the property is navigable or actionable.
 */
export function IconLabelProperty({
  ariaLabel,
  className,
  icon: Icon,
  iconClassName,
  label,
  leading,
  muted = false,
  render,
  trailing,
  trailingVisibility = 'always',
  variant = 'badge',
}: Readonly<IconLabelPropertyProps>) {
  const hidesTrailing = Boolean(trailing) && trailingVisibility === 'hover'

  return (
    <PropertySurface
      aria-label={
        ariaLabel ? `${ariaLabel}: ${typeof label === 'string' ? label : ''}`.trim() : undefined
      }
      className={cn('max-w-full', hidesTrailing && 'group/property', className)}
      muted={muted}
      render={render}
      // With an affordance inside, the surface cannot be `img`: a child of `img`
      // is presentational to the accessibility tree, and the button would vanish
      // from it. `group` keeps the name and leaves the button reachable.
      role={trailing && ariaLabel ? 'group' : undefined}
      variant={variant}
    >
      {leading}
      {Icon ? <Icon aria-hidden className={cn('size-3', iconClassName)} /> : null}
      <span className='truncate'>{label}</span>
      {hidesTrailing ? (
        <span
          // Keyboard and touch have no hover: without `focus-within` the affordance
          // would be unreachable by `Tab`, and without `pointer-coarse` it would
          // vanish on a phone.
          className='pointer-coarse:opacity-100 flex shrink-0 self-stretch items-center opacity-0 transition-opacity group-focus-within/property:opacity-100 group-hover/property:opacity-100'
          data-slot='property-trailing'
        >
          {trailing}
        </span>
      ) : (
        trailing
      )}
    </PropertySurface>
  )
}
