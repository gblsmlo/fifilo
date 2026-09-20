'use client'

import {
  Card,
  CardFrame,
  CardFrameAction,
  CardFrameDescription,
  CardFrameFooter,
  CardFrameHeader,
  CardFrameTitle,
  CardPanel,
} from '@fifilo/ui/components/card'
import { cn } from '@fifilo/ui/lib/utils'
import { type ReactNode, useId } from 'react'
import { StateGuard, type StateSurfaceProps, type SurfaceGuardState } from '../state-surface'

interface WidgetBaseProps {
  /** Trailing control of the header: a button, a link or a filter, in the showcase's vocabulary. */
  action?: ReactNode
  children?: ReactNode
  className?: string
  /** Second line of the header, under the title. */
  description?: ReactNode
  /** Footer of the frame: pagination, a "load more" or a summary. */
  footer?: ReactNode
  /** Accessible name of the widget and its heading. */
  title: ReactNode
}

/**
 * When the body carries remote data, `state` and `surface` travel together:
 * any state other than `data` replaces the body with the `StateGuard`
 * treatment inside a panel, using the `state-kinds` vocabulary. Without
 * `state` the body is always `children`.
 */
type WidgetStateProps =
  | { state?: undefined; surface?: undefined }
  | { state: SurfaceGuardState; surface: Omit<StateSurfaceProps, 'kind'> }

export type WidgetProps = WidgetBaseProps & WidgetStateProps

/**
 * The dashboard frame of the Coss `CardFrame` particles: a header with title,
 * description and action, a body and a footer. The body is either a `Table`
 * laid straight into the frame (`p-table-7`, `p-table-8`) or a `WidgetPanel`
 * around a chart, a form or free content (`p-card-5`, `p-card-11`). It knows
 * nothing about a route, a query or a domain word; the showcase composes it.
 */
export function Widget({
  action,
  children,
  className,
  description,
  footer,
  state,
  surface,
  title,
}: Readonly<WidgetProps>) {
  const titleId = useId()

  const body =
    state && state !== 'data' ? (
      <WidgetPanel>
        <StateGuard
          state={state}
          surface={{ ...surface, className: cn('border-0 py-6', surface.className) }}
        >
          {children}
        </StateGuard>
      </WidgetPanel>
    ) : (
      children
    )

  return (
    <CardFrame
      aria-labelledby={titleId}
      className={cn('w-full', className)}
      data-slot='widget'
      render={<section />}
    >
      <CardFrameHeader>
        <CardFrameTitle id={titleId} render={<h2>{title}</h2>} />
        {description ? <CardFrameDescription>{description}</CardFrameDescription> : null}
        {action ? <CardFrameAction>{action}</CardFrameAction> : null}
      </CardFrameHeader>
      {body}
      {footer ? <CardFrameFooter data-slot='widget-footer'>{footer}</CardFrameFooter> : null}
    </CardFrame>
  )
}

export interface WidgetPanelProps {
  children: ReactNode
  className?: string
}

/** The padded card body a widget uses for anything that is not a table. */
export function WidgetPanel({ children, className }: Readonly<WidgetPanelProps>) {
  return (
    <Card data-slot='widget-panel'>
      <CardPanel className={className}>{children}</CardPanel>
    </Card>
  )
}
