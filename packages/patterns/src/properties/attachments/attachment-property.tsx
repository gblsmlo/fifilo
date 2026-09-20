'use client'

import { cn } from '@fifilo/ui/lib/utils'
import { XIcon } from 'lucide-react'
import type { ComponentPropsWithoutRef, ReactNode } from 'react'
import { IconLabelProperty } from '../icon-label/icon-label-property'
import { PropertySurface } from '../property-surface'
import { type AttachmentType, AttachmentTypeIcon } from './attachment-type'

export interface AttachmentPropertyProps
  extends Omit<ComponentPropsWithoutRef<'a'>, 'children' | 'download'> {
  action?: 'anchor' | 'download'
  label: ReactNode
  /** Absent, the attachment offers no removal — it is the chip of a read-only viewer. */
  onRemove?: () => void
  removeLabel?: string
  type?: AttachmentType
}

/**
 * An attachment is a navigable property, in the anatomy of the `TagsProperty`
 * chip: type icon on the left, label, and the removal `×` on the right. The pill
 * is the wrapper and the link lives inside it — a button inside an anchor is
 * invalid markup, and a screen reader would announce a single control.
 *
 * The affordance on the right is always the same, removal; `anchor` and
 * `download` only decide how the destination opens. A download icon there would
 * compete with the `×` for the same corner and make two identical chips look
 * different.
 *
 * Singular is the item; `AttachmentsProperty` is the row that hosts it.
 */
export function AttachmentProperty({
  action = 'anchor',
  className,
  label,
  onRemove,
  removeLabel,
  type,
  ...props
}: Readonly<AttachmentPropertyProps>) {
  return (
    <PropertySurface
      className={cn('max-w-full', onRemove && 'pe-0', className)}
      data-slot='attachment-property'
    >
      <IconLabelProperty
        label={label}
        leading={type ? <AttachmentTypeIcon type={type} /> : null}
        render={
          <a
            data-slot='attachment-property-link'
            download={action === 'download' ? true : undefined}
            {...props}
          />
        }
        variant='plain'
      />
      {onRemove ? (
        <button
          aria-label={removeLabel ?? 'Remover anexo'}
          className='h-full shrink-0 cursor-pointer px-1.5 opacity-80 transition-opacity hover:opacity-100'
          data-slot='attachment-property-remove'
          onClick={onRemove}
          type='button'
        >
          <XIcon aria-hidden='true' />
        </button>
      ) : null}
    </PropertySurface>
  )
}
