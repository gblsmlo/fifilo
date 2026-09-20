'use client'

import { mergeProps } from '@base-ui/react/merge-props'
import { useRender } from '@base-ui/react/use-render'
import { badgeVariants } from '@fifilo/ui/components/badge'
import { cn } from '@fifilo/ui/lib/utils'
import { cva } from 'class-variance-authority'
import type React from 'react'

export type PropertyVariant = 'badge' | 'plain'

export const propertySurfaceVariants = cva('', {
  defaultVariants: {
    variant: 'badge',
  },
  variants: {
    variant: {
      badge: badgeVariants({ variant: 'secondary' }),
      plain: cn(
        'relative inline-flex min-w-0 max-w-full items-center gap-1 whitespace-nowrap font-medium text-sm outline-none transition-colors',
        // The hover fill is the badge pill, drawn by `::before`: taking up
        // space, it would push the value out and make `max-w-full` measure
        // against a parent it sizes itself.
        'before:-inset-x-[calc(--spacing(2.5)-1px)] before:-inset-y-0.5 before:pointer-events-none before:absolute before:rounded-full before:transition-colors',
        '[button&,a&]:cursor-pointer [button&,a&]:hover:before:bg-secondary',
        // Inside a badge — the attachment chip's link — the frame already belongs
        // to the outer surface, and this one would draw a second pill.
        '[[data-variant="badge"]_&]:before:content-none',
        'focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-background',
        'disabled:pointer-events-none disabled:opacity-64',
      ),
    },
  },
})

/**
 * The field a property edits in place of the value. An `input` measures twenty
 * characters on its own, and without this the row jumps in width when editing
 * starts, pushing copy and icon away from the value.
 */
export const propertyFieldClassName = 'w-auto field-sizing-content'

export interface PropertySurfaceProps extends useRender.ComponentProps<'span'> {
  variant?: PropertyVariant
  /**
   * The surface shows absence — placeholder or fallback — and not a value. The
   * text falls back to the secondary tone, like a field's placeholder: that way
   * the property row says at a glance what was filled in and what was not.
   */
  muted?: boolean
}

export function PropertySurface({
  className,
  muted = false,
  render,
  variant = 'badge',
  ...props
}: PropertySurfaceProps): React.ReactElement {
  const defaultProps = {
    // The absence tone comes after the variant: the badge brings
    // `text-secondary-foreground`, and in `twMerge` the last color wins.
    className: cn(
      propertySurfaceVariants({ variant }),
      muted && 'text-muted-foreground',
      className,
    ),
    'data-slot': 'property-surface',
    'data-variant': variant,
    ...(muted ? { 'data-empty': 'true' } : {}),
    /**
     * `aria-label` num `span` sem papel e atributo proibido: o nome acessivel nao
     * tem onde se apoiar, e o axe reprova. Quando a superficie recebe rotulo e nao
     * declara papel, ela e um composto de icone e texto — `img` e o papel que
     * aceita nome e mantem a leitura correta. So vale para a superficie padrao:
     * com `render`, quem decide o papel e o elemento pedido — um `button` que
     * virasse `img` perderia o proprio papel.
     */
    ...(props['aria-label'] && !props.role && !render ? { role: 'img' } : {}),
  }

  return useRender({
    defaultTagName: 'span',
    props: mergeProps<'span'>(defaultProps, props),
    render,
  })
}
