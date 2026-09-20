'use client'

import { Card, CardPanel } from '@fifilo/ui/components/card'
import { Skeleton } from '@fifilo/ui/components/skeleton'
import { Text } from '@fifilo/ui/components/text'
import { cn } from '@fifilo/ui/lib/utils'
import type { ComponentPropsWithoutRef, ReactNode } from 'react'

export type StatTone = 'default' | 'negative' | 'positive'

export interface StatProps extends Omit<ComponentPropsWithoutRef<'div'>, 'title'> {
  /** Third line, under the value: a period, a comparison, a caveat. */
  hint?: ReactNode
  label: ReactNode
  /** Draws a skeleton in place of the value and announces the card as busy. */
  loading?: boolean
  tone?: StatTone
  value?: ReactNode
}

const TONE_CLASS: Record<StatTone, string> = {
  default: 'text-foreground',
  negative: 'text-destructive-foreground',
  positive: 'text-success-foreground',
}

/**
 * One key figure in a Coss card: label, value and an optional hint. The
 * showcase formats the value and picks the tone; the shell only knows a
 * number is being highlighted.
 */
export function Stat({
  className,
  hint,
  label,
  loading = false,
  tone = 'default',
  value,
  ...props
}: Readonly<StatProps>) {
  return (
    <Card
      aria-busy={loading || undefined}
      className={className}
      data-slot='stat'
      data-tone={tone}
      density='sm'
      role={loading ? 'status' : undefined}
      {...props}
    >
      <CardPanel className='flex flex-col gap-1'>
        <Text foreground='muted' render={<p data-slot='stat-label' />} size='sm'>
          {label}
        </Text>
        {loading ? (
          <Skeleton aria-hidden='true' className='h-8 w-28' data-slot='stat-skeleton' />
        ) : (
          <Text
            className={cn('tabular-nums', TONE_CLASS[tone])}
            render={<p data-slot='stat-value' />}
            size='2xl'
            tracking='tight'
            weight='semibold'
          >
            {value}
          </Text>
        )}
        {hint ? (
          <Text foreground='muted' render={<p data-slot='stat-hint' />} size='xs'>
            {hint}
          </Text>
        ) : null}
      </CardPanel>
    </Card>
  )
}

export type StatGroupColumns = 2 | 3 | 4

export interface StatGroupProps extends ComponentPropsWithoutRef<'div'> {
  /** Columns from the `sm` breakpoint up; one column below it. */
  columns?: StatGroupColumns
}

const COLUMNS_CLASS: Record<StatGroupColumns, string> = {
  2: 'sm:grid-cols-2',
  3: 'sm:grid-cols-3',
  4: 'sm:grid-cols-2 lg:grid-cols-4',
}

export function StatGroup({ className, columns = 3, ...props }: Readonly<StatGroupProps>) {
  return (
    <div
      className={cn('grid gap-4', COLUMNS_CLASS[columns], className)}
      data-slot='stat-group'
      {...props}
    />
  )
}
