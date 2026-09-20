'use client'

import { cn } from '@fifilo/ui/lib/utils'
import type React from 'react'
import { PropertySurface, type PropertySurfaceProps } from './property-surface'

export type PropertyTriggerProps = PropertySurfaceProps

/**
 * A property's surface when it is clicked: the same `badge` or `plain`, now as a
 * button and already contained within the row width. It serves as `render` for a
 * Select, Combobox or Popover trigger, which remains the one that opens.
 */
export function PropertyTrigger({
  className,
  render,
  ...props
}: PropertyTriggerProps): React.ReactElement {
  return (
    <PropertySurface
      {...props}
      className={cn('max-w-full', className)}
      render={render ?? <button type='button' />}
    />
  )
}
