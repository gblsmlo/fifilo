'use client'

import { ToolbarGroup, Toolbar as ToolbarPrimitive } from '@fifilo/ui/components/toolbar'
import { cn } from '@fifilo/ui/lib/utils'
import type { ComponentProps, ReactElement, ReactNode } from 'react'

export interface CollectionToolbarProps extends ComponentProps<typeof ToolbarPrimitive> {
  endSlot?: ReactNode
  startSlot?: ReactNode
}

export type CollectionToolbarGroupProps = ComponentProps<typeof ToolbarGroup>

export function CollectionToolbar({
  'aria-label': ariaLabel = 'Controles da coleção',
  children,
  className,
  endSlot,
  startSlot,
  variant = 'plain',
  ...props
}: Readonly<CollectionToolbarProps>): ReactElement {
  return (
    <ToolbarPrimitive
      aria-label={ariaLabel}
      className={cn('h-9 justify-between md:h-10', className)}
      variant={variant}
      {...props}
    >
      {startSlot ? <ToolbarGroup className='min-w-0'>{startSlot}</ToolbarGroup> : null}
      {children}
      {endSlot ? <ToolbarGroup className='ms-auto'>{endSlot}</ToolbarGroup> : null}
    </ToolbarPrimitive>
  )
}

export function CollectionToolbarGroup(props: CollectionToolbarGroupProps): ReactElement {
  return <ToolbarGroup {...props} />
}
