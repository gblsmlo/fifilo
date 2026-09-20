'use client'

import { Button } from '@fifilo/ui/components/button'
import { Calendar } from '@fifilo/ui/components/calendar'
import { Popover, PopoverPopup, PopoverTrigger } from '@fifilo/ui/components/popover'
import { cn } from '@fifilo/ui/lib/utils'
import { CalendarRangeIcon } from 'lucide-react'
import type React from 'react'
import { useState } from 'react'
import type { DateRange } from 'react-day-picker'
import type { DatePropertyDropdownPlacement } from '../date/date-property'
import { PropertySurface, type PropertyVariant } from '../property-surface'
import { PropertyTrigger } from '../property-trigger'

export type { DateRange }

export interface DateRangePropertyProps {
  /** The range in the calendar's own type; `undefined` is the absence of a choice. */
  value: DateRange | undefined
  allowClear?: boolean
  ariaLabel?: string
  calendarProps?: Omit<
    React.ComponentProps<typeof Calendar>,
    'defaultMonth' | 'mode' | 'onSelect' | 'selected'
  >
  className?: string
  clearLabel?: string
  disabled?: boolean
  dropdownPlacement?: DatePropertyDropdownPlacement
  /** Label when neither end has been chosen. */
  fallback?: string
  locale?: string
  /** Months side by side; two is what lets a short range fit without navigating. */
  numberOfMonths?: number
  readOnly?: boolean
  variant?: PropertyVariant
  onValueChange?: (value: DateRange | undefined) => void
}

/**
 * A range is one property, not two dates side by side: a start with no end and
 * an end with no start are states of the same thing, and splitting them makes
 * the row show two empty pills where there is no period at all.
 *
 * The value is the calendar's own `DateRange` — whoever persists a string
 * converts at the boundary, as the rest of the domain already does with dates.
 */
export function DateRangeProperty({
  allowClear = true,
  ariaLabel,
  calendarProps,
  className,
  clearLabel = 'Limpar período',
  disabled = false,
  dropdownPlacement,
  fallback = 'Sem período',
  locale = 'en-US',
  numberOfMonths = 2,
  onValueChange,
  readOnly = false,
  value,
  variant = 'badge',
}: Readonly<DateRangePropertyProps>) {
  const [open, setOpen] = useState(false)
  const label = formatDateRangeProperty(value, fallback, locale)
  const isEmpty = label === fallback

  if (readOnly || !onValueChange) {
    return (
      <PropertySurface className={cn('max-w-full', className)} muted={isEmpty} variant={variant}>
        <DateRangePropertyContent label={label} />
      </PropertySurface>
    )
  }

  return (
    <Popover onOpenChange={setOpen} open={open}>
      <PopoverTrigger
        aria-label={`${ariaLabel ?? 'Period'}: ${label}`}
        disabled={disabled}
        render={<PropertyTrigger className={className} muted={isEmpty} variant={variant} />}
      >
        <DateRangePropertyContent label={label} />
      </PopoverTrigger>
      <PopoverPopup align='start' className='w-auto' side='bottom' {...dropdownPlacement}>
        <Calendar
          defaultMonth={value?.from}
          mode='range'
          numberOfMonths={numberOfMonths}
          selected={value}
          // It does not close on its own: the first click already returns `from` and
          // `to` on the same day, and closing there would only ever allow a single
          // day — it is the second click that opens the range.
          onSelect={onValueChange}
          {...calendarProps}
        />
        {allowClear ? (
          <div className='border-t p-2'>
            <Button
              className='w-full justify-start'
              size='sm'
              type='button'
              variant='ghost'
              onClick={() => {
                onValueChange(undefined)
                setOpen(false)
              }}
            >
              {clearLabel}
            </Button>
          </div>
        ) : null}
      </PopoverPopup>
    </Popover>
  )
}

function DateRangePropertyContent({ label }: Readonly<{ label: string }>) {
  return (
    <>
      <CalendarRangeIcon aria-hidden className='size-3' />
      <span className='truncate'>{label}</span>
    </>
  )
}

export function formatDateRangeProperty(
  value: DateRange | undefined,
  fallback: string,
  locale: string,
): string {
  const from = formatEnd(value?.from, locale)
  const to = formatEnd(value?.to, locale)

  if (from && to) return `${from} – ${to}`
  if (from) return `A partir de ${from}`
  if (to) return `Até ${to}`
  return fallback
}

/**
 * No `timeZone`: the calendar's `DateRange` holds a local day marker, and
 * formatting it in UTC would show the previous day in an eastern zone. No year,
 * because in a property the date is a short reference.
 */
function formatEnd(date: Date | undefined, locale: string): string | null {
  if (!date || Number.isNaN(date.getTime())) return null
  return new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short' }).format(date)
}
