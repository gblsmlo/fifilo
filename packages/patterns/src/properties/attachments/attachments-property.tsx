'use client'

import { cn } from '@fifilo/ui/lib/utils'
import { PlusIcon } from 'lucide-react'
import { Children, type ComponentType, type ReactNode, type SVGProps } from 'react'
import { PropertySurface } from '../property-surface'

export interface AttachmentsPropertyAction {
  label: string
  onSelect: () => void
  disabled?: boolean
  icon?: ComponentType<SVGProps<SVGSVGElement>>
}

export interface AttachmentsPropertyProps {
  children?: ReactNode
  action?: AttachmentsPropertyAction
  ariaLabel?: string
  className?: string
}

export function AttachmentsProperty({
  action,
  ariaLabel,
  children,
  className,
}: Readonly<AttachmentsPropertyProps>) {
  const hasAttachments = Children.count(children) > 0
  const Icon = hasAttachments ? PlusIcon : action?.icon

  return (
    <fieldset
      aria-label={ariaLabel}
      className={cn('flex min-w-0 flex-wrap items-center gap-x-1 gap-y-0.5', className)}
      data-slot='attachments-property'
    >
      {children}
      {action ? (
        <PropertySurface
          className={cn(hasAttachments && 'w-6 px-0 text-muted-foreground')}
          muted={!hasAttachments}
          render={
            <button
              aria-label={action.label}
              disabled={action.disabled}
              onClick={action.onSelect}
              type='button'
            />
          }
        >
          {Icon ? <Icon aria-hidden className='size-3.5' /> : null}
          {hasAttachments ? null : <span className='truncate'>{action.label}</span>}
        </PropertySurface>
      ) : null}
    </fieldset>
  )
}
