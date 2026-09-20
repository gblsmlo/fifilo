'use client'

import { Button } from '@fifilo/ui/components/button'
import { Calendar } from '@fifilo/ui/components/calendar'
import { cn } from '@fifilo/ui/lib/utils'
import { type ReactElement, useState } from 'react'
import type { DateRange } from 'react-day-picker'

export type { DateRange }

export interface RangeCalendarPreset {
  id: string
  label: string
  range: DateRange
}

export interface RangeCalendarProps {
  className?: string
  /** Days after this one are refused; the default leaves the future open. */
  disabledAfter?: Date
  numberOfMonths?: number
  onValueChange: (value: DateRange) => void
  /** Shortcuts in the left rail, in the vocabulary of whoever composes it. */
  presets?: readonly RangeCalendarPreset[]
  value: DateRange | undefined
}

const addDays = (date: Date, days: number): Date =>
  new Date(date.getFullYear(), date.getMonth(), date.getDate() + days)

const startOfMonth = (date: Date): Date => new Date(date.getFullYear(), date.getMonth(), 1)

const endOfMonth = (date: Date): Date => new Date(date.getFullYear(), date.getMonth() + 1, 0)

const addMonths = (date: Date, months: number): Date =>
  new Date(date.getFullYear(), date.getMonth() + months, 1)

const startOfYear = (date: Date): Date => new Date(date.getFullYear(), 0, 1)

const endOfYear = (date: Date): Date => new Date(date.getFullYear(), 11, 31)

/**
 * The shortcuts every period filter repeats. They are a default, not a
 * contract: a collection with its own vocabulary passes `presets` instead.
 */
export function defaultRangeCalendarPresets(today: Date = new Date()): RangeCalendarPreset[] {
  const lastMonth = addMonths(today, -1)

  return [
    { id: 'today', label: 'Hoje', range: { from: today, to: today } },
    {
      id: 'yesterday',
      label: 'Ontem',
      range: { from: addDays(today, -1), to: addDays(today, -1) },
    },
    { id: 'last-7-days', label: 'Últimos 7 dias', range: { from: addDays(today, -6), to: today } },
    {
      id: 'last-30-days',
      label: 'Últimos 30 dias',
      range: { from: addDays(today, -29), to: today },
    },
    { id: 'month-to-date', label: 'Mês até hoje', range: { from: startOfMonth(today), to: today } },
    {
      id: 'last-month',
      label: 'Mês passado',
      range: { from: startOfMonth(lastMonth), to: endOfMonth(lastMonth) },
    },
    { id: 'year-to-date', label: 'Ano até hoje', range: { from: startOfYear(today), to: today } },
    {
      id: 'last-year',
      label: 'Ano passado',
      range: {
        from: startOfYear(addMonths(today, -12)),
        to: endOfYear(addMonths(today, -12)),
      },
    },
  ]
}

/**
 * A range picked either by a shortcut or on the calendar, with the rail on the
 * left. Choosing a preset also moves the visible month to its end, so the
 * choice is visible on the grid instead of only in the value.
 */
export function RangeCalendar({
  className,
  disabledAfter,
  numberOfMonths = 2,
  onValueChange,
  presets = defaultRangeCalendarPresets(),
  value,
}: Readonly<RangeCalendarProps>): ReactElement {
  const [month, setMonth] = useState(() => value?.to ?? value?.from ?? new Date())

  return (
    <div className={cn('flex max-sm:flex-col', className)}>
      {presets.length > 0 ? (
        <div className='relative py-1 ps-1 max-sm:order-1 max-sm:border-t'>
          <div className='flex h-full flex-col sm:border-e sm:pe-3'>
            {presets.map((preset) => (
              <Button
                className='w-full justify-start'
                key={preset.id}
                onClick={() => {
                  onValueChange(preset.range)
                  if (preset.range.to) setMonth(preset.range.to)
                }}
                size='sm'
                type='button'
                variant='ghost'
              >
                {preset.label}
              </Button>
            ))}
          </div>
        </div>
      ) : null}
      <Calendar
        className={cn('max-sm:pb-3', presets.length > 0 && 'sm:ps-5')}
        disabled={disabledAfter ? [{ after: disabledAfter }] : undefined}
        mode='range'
        month={month}
        numberOfMonths={numberOfMonths}
        onMonthChange={setMonth}
        onSelect={(next) => {
          if (next) onValueChange(next)
        }}
        selected={value}
      />
    </div>
  )
}
