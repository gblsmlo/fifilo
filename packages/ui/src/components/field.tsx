'use client'

import { Field as FieldPrimitive } from '@base-ui/react/field'
import type React from 'react'
import { cn } from '../lib/utils'

export function Field({ className, ...props }: FieldPrimitive.Root.Props): React.ReactElement {
  return (
    <FieldPrimitive.Root
      className={cn('flex flex-col items-start gap-2', className)}
      data-slot='field'
      {...props}
    />
  )
}

export function FieldLabel({
  className,
  ...props
}: FieldPrimitive.Label.Props): React.ReactElement {
  return (
    <FieldPrimitive.Label
      className={cn(
        'inline-flex items-center gap-2 font-medium text-base/4.5 text-foreground data-disabled:opacity-64 sm:text-sm/4',
        className,
      )}
      data-slot='field-label'
      {...props}
    />
  )
}

export function FieldItem({ className, ...props }: FieldPrimitive.Item.Props): React.ReactElement {
  return <FieldPrimitive.Item className={cn('flex', className)} data-slot='field-item' {...props} />
}

export function FieldDescription({
  className,
  ...props
}: FieldPrimitive.Description.Props): React.ReactElement {
  return (
    <FieldPrimitive.Description
      className={cn('text-muted-foreground text-xs', className)}
      data-slot='field-description'
      {...props}
    />
  )
}

export function FieldError({
  className,
  match,
  ...props
}: FieldPrimitive.Error.Props): React.ReactElement {
  // Base UI shows the error only from the field's native validation. Here the
  // validation comes from the schema and arrives as children, so an explicit
  // message is itself the display condition; without one the primitive default
  // still applies.
  return (
    <FieldPrimitive.Error
      className={cn('text-destructive-foreground text-xs', className)}
      data-slot='field-error'
      match={match ?? (Boolean(props.children) || undefined)}
      {...props}
    />
  )
}

export const FieldControl: typeof FieldPrimitive.Control = FieldPrimitive.Control
export const FieldValidity: typeof FieldPrimitive.Validity = FieldPrimitive.Validity

export { FieldPrimitive }
