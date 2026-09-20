'use client'

import { mergeProps } from '@base-ui/react/merge-props'
import { useRender } from '@base-ui/react/use-render'
import {
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
  cardVariants,
} from '@fifilo/ui/components/card'
import { cn } from '@fifilo/ui/lib/utils'
import { type VariantProps, cva } from 'class-variance-authority'
import {
  type ComponentProps,
  type ComponentPropsWithoutRef,
  type ReactElement,
  createContext,
  useContext,
} from 'react'

export type KanbanCardDisplay = 'full' | 'compact'

export const kanbanCardVariants = cva(
  'relative isolate min-w-0 w-full max-w-full overflow-hidden [&_[data-kanban-card-action]]:relative [&_[data-kanban-card-action]]:z-10',
  {
    defaultVariants: {
      dimmed: false,
      selected: false,
      variant: 'default',
    },
    variants: {
      dimmed: {
        false: null,
        true: 'border-dashed shadow-none',
      },
      selected: {
        false: null,
        true: 'ring-2 ring-primary/40 ring-offset-2 ring-offset-background',
      },
      variant: {
        default: null,
        interactive:
          'cursor-pointer rounded-md border-border/70 bg-card/95 text-left shadow-none outline-none transition-colors hover:border-border hover:bg-accent/35 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background has-focus-visible:ring-2 has-focus-visible:ring-primary has-focus-visible:ring-offset-2 has-focus-visible:ring-offset-background [&>:focus-visible]:outline-none',
      },
    },
  },
)

const kanbanCardHeaderVariants = cva('gap-1', {
  variants: {
    display: {
      compact: 'flex min-h-10 min-w-0 items-center gap-2 px-3 py-2',
      full: 'px-3 pt-3 pb-2',
    },
  },
})

const kanbanCardTitleVariants = cva('font-medium text-sm leading-5', {
  variants: {
    display: {
      compact: 'min-w-0 flex-1 truncate',
      full: null,
    },
  },
})

const kanbanCardDescriptionVariants = cva('text-card-foreground/70 text-xs leading-5', {
  variants: {
    display: {
      compact: null,
      full: 'line-clamp-3',
    },
  },
})

const kanbanCardContentVariants = cva('px-3 pt-0 pb-3')

const kanbanCardFooterVariants = cva(
  'min-h-9 border-t border-border/70 px-3 py-2 text-card-foreground/70 text-xs',
)

export interface KanbanCardProps extends useRender.ComponentProps<'article'> {
  density?: VariantProps<typeof cardVariants>['density']
  dimmed?: boolean
  display?: KanbanCardDisplay
  selected?: boolean
  variant?: VariantProps<typeof kanbanCardVariants>['variant']
}

export type KanbanCardActionProps = ComponentProps<typeof CardAction>
export type KanbanCardContentProps = ComponentProps<typeof CardContent>
export type KanbanCardDescriptionProps = ComponentProps<typeof CardDescription>
export type KanbanCardFooterProps = ComponentProps<typeof CardFooter>
export type KanbanCardHeaderProps = ComponentProps<typeof CardHeader>
export type KanbanCardOpenTriggerProps = ComponentPropsWithoutRef<'button'>
export type KanbanCardTitleProps = ComponentProps<typeof CardTitle>

const KanbanCardDisplayContext = createContext<KanbanCardDisplay>('full')

export function KanbanCard({
  className,
  density = 'sm',
  dimmed = false,
  display = 'full',
  render,
  selected = false,
  variant = 'default',
  ...props
}: KanbanCardProps): ReactElement {
  const defaultProps = {
    className: cn(
      cardVariants({ density }),
      kanbanCardVariants({ dimmed, selected, variant }),
      className,
    ),
    'data-density': density,
    'data-display': display,
    'data-pattern': 'kanban-card',
    'data-slot': 'card',
    'data-state': selected ? 'selected' : undefined,
    'data-variant': variant,
  }

  const card = useRender({
    defaultTagName: 'article',
    props: mergeProps<'article'>(defaultProps, props),
    render,
  })

  return (
    <KanbanCardDisplayContext.Provider value={display}>{card}</KanbanCardDisplayContext.Provider>
  )
}

export function KanbanCardHeader({ className, ...props }: KanbanCardHeaderProps): ReactElement {
  const display = useContext(KanbanCardDisplayContext)

  return <CardHeader className={cn(kanbanCardHeaderVariants({ display }), className)} {...props} />
}

export function KanbanCardTitle({ className, ...props }: KanbanCardTitleProps): ReactElement {
  const display = useContext(KanbanCardDisplayContext)

  return <CardTitle className={cn(kanbanCardTitleVariants({ display }), className)} {...props} />
}

export function KanbanCardDescription({
  className,
  ...props
}: KanbanCardDescriptionProps): ReactElement {
  const display = useContext(KanbanCardDisplayContext)

  return (
    <CardDescription
      className={cn(kanbanCardDescriptionVariants({ display }), className)}
      {...props}
      hidden={display === 'compact' || props.hidden}
    />
  )
}

export function KanbanCardAction({ className, ...props }: KanbanCardActionProps): ReactElement {
  const display = useContext(KanbanCardDisplayContext)

  return (
    <CardAction
      className={cn(display === 'compact' && 'shrink-0 self-center', className)}
      data-kanban-card-action=''
      {...props}
    />
  )
}

/**
 * Click target for the whole card, stretched over it.
 *
 * It exists because a card that is a `button` cannot host an editable property —
 * a button inside a button is invalid HTML. As a sibling trigger, the card goes
 * back to being an `article` and every inner control stays clickable, as long as
 * it carries `data-kanban-card-action`: the attribute raises the control above
 * this trigger and already keeps the drag from stealing the pointer in
 * `SortableKanbanCard`.
 */
export function KanbanCardOpenTrigger({
  className,
  ...props
}: KanbanCardOpenTriggerProps): ReactElement {
  return (
    <button
      className={cn('absolute inset-0 cursor-pointer rounded-[inherit] outline-none', className)}
      data-slot='kanban-card-open-trigger'
      type='button'
      {...props}
    />
  )
}

export function KanbanCardContent({ className, ...props }: KanbanCardContentProps): ReactElement {
  const display = useContext(KanbanCardDisplayContext)

  return (
    <CardContent
      className={cn(kanbanCardContentVariants(), className)}
      {...props}
      hidden={display === 'compact' || props.hidden}
    />
  )
}

export function KanbanCardFooter({ className, ...props }: KanbanCardFooterProps): ReactElement {
  const display = useContext(KanbanCardDisplayContext)

  return (
    <CardFooter
      className={cn(kanbanCardFooterVariants(), className)}
      {...props}
      hidden={display === 'compact' || props.hidden}
    />
  )
}
