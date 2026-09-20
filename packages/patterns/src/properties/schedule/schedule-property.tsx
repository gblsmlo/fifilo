'use client'

import { Button } from '@fifilo/ui/components/button'
import { Calendar } from '@fifilo/ui/components/calendar'
import { InputGroup, InputGroupAddon, InputGroupInput } from '@fifilo/ui/components/input-group'
import { Popover, PopoverPopup, PopoverTrigger } from '@fifilo/ui/components/popover'
import {
  Select,
  SelectItem,
  SelectPopup,
  SelectTrigger,
  SelectValue,
} from '@fifilo/ui/components/select'
import { Separator } from '@fifilo/ui/components/separator'
import { Switch } from '@fifilo/ui/components/switch'
import { cn } from '@fifilo/ui/lib/utils'
import {
  CalendarIcon,
  CalendarOffIcon,
  CalendarRangeIcon,
  ClockIcon,
  RepeatIcon,
  SunIcon,
  SunriseIcon,
} from 'lucide-react'
import { type ComponentProps, type ReactNode, useId, useState } from 'react'
import type { DateRange } from 'react-day-picker'
import { DateProperty } from '../date/date-property'
import { PropertySurface, type PropertyVariant } from '../property-surface'
import { PropertyTrigger } from '../property-trigger'
import { SelectProperty } from '../select/select-property'

/**
 * When something happens: the day (or the range of days), the wall-clock start
 * and end time, and the recurrence. Whoever persists converts at the boundary —
 * `from` and `to` are local calendar days, `startTime` and `endTime` are
 * `HH:mm`, `until` is the string `DateProperty` serializes.
 */
export interface ScheduleValue {
  from: Date | undefined
  /** End of a window longer than a day; the picker does not write to it today. */
  to: Date | undefined
  allDay: boolean
  startTime: string
  endTime: string
  frequency: string | null
  until: string | null
}

export const emptyScheduleValue: ScheduleValue = {
  allDay: true,
  endTime: '',
  frequency: null,
  from: undefined,
  startTime: '',
  to: undefined,
  until: null,
}

export type ScheduleTimeControl = 'select' | 'input'

export interface ScheduleRecurrenceOption {
  label: string
  value: string
}

export const defaultScheduleRecurrenceOptions: readonly ScheduleRecurrenceOption[] = [
  { label: 'Diariamente', value: 'daily' },
  { label: 'Dias úteis', value: 'weekdays' },
  { label: 'Semanalmente', value: 'weekly' },
  { label: 'Mensalmente', value: 'monthly' },
  { label: 'Anualmente', value: 'yearly' },
]

interface SchedulePreset {
  hint: string
  label: string
  icon: typeof SunIcon
  range: DateRange | undefined
}

export function startOfLocalDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate())
}

function addDays(date: Date, days: number): Date {
  const next = startOfLocalDay(date)
  next.setDate(next.getDate() + days)
  return next
}

/** Next weekday starting from tomorrow; today is already the "Hoje" shortcut. */
function nextWeekday(date: Date, weekday: number): Date {
  const delta = (weekday - date.getDay() + 7) % 7 || 7
  return addDays(date, delta)
}

function capitalize(text: string): string {
  return text.charAt(0).toLocaleUpperCase('pt-BR') + text.slice(1)
}

const weekdayFormat = new Intl.DateTimeFormat('pt-BR', { weekday: 'short' })
const dayFormat = new Intl.DateTimeFormat('pt-BR', { day: 'numeric', month: 'short' })
const weekdayDayFormat = new Intl.DateTimeFormat('pt-BR', {
  day: 'numeric',
  month: 'short',
  weekday: 'short',
})

function formatWeekday(date: Date): string {
  return capitalize(weekdayFormat.format(date).replaceAll('.', ''))
}

/** No year and no period: in a pill the date is a short reference. */
export function formatScheduleDay(date: Date): string {
  return dayFormat.format(date).replaceAll('.', '')
}

/**
 * The usual date shortcuts: the weekday on the right is what makes "Próxima
 * semana" mean a date, and not an idea. "Sem data" stays in the list because
 * clearing is as common a choice as setting.
 */
function buildDayPresets(today: Date): readonly SchedulePreset[] {
  const tomorrow = addDays(today, 1)
  const weekend = nextWeekday(today, 6)
  const nextWeek = nextWeekday(today, 1)

  return [
    { hint: formatWeekday(today), icon: CalendarIcon, label: 'Hoje', range: { from: today } },
    { hint: formatWeekday(tomorrow), icon: SunIcon, label: 'Amanhã', range: { from: tomorrow } },
    {
      hint: formatWeekday(weekend),
      icon: SunriseIcon,
      label: 'Este fim de semana',
      range: { from: weekend },
    },
    {
      hint: capitalize(weekdayDayFormat.format(nextWeek).replaceAll('.', '')),
      icon: CalendarRangeIcon,
      label: 'Próxima semana',
      range: { from: nextWeek },
    },
    { hint: '', icon: CalendarOffIcon, label: 'Sem data', range: undefined },
  ]
}

function PresetList({
  onPick,
  presets,
}: Readonly<{
  onPick: (range: DateRange | undefined) => void
  presets: readonly SchedulePreset[]
}>) {
  return (
    <ul aria-label='Atalhos de data' className='flex flex-col'>
      {presets.map(({ hint, icon: Icon, label, range }) => (
        <li key={label}>
          <button
            className={cn(
              'flex h-8 w-full cursor-pointer items-center gap-2 rounded-md px-2 text-sm outline-none transition-colors hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring',
              !range && 'text-muted-foreground',
            )}
            data-slot='schedule-preset'
            onClick={() => onPick(range)}
            type='button'
          >
            <Icon aria-hidden className='size-4 shrink-0 opacity-80' />
            <span className='flex-1 truncate text-start'>{label}</span>
            {hint ? <span className='shrink-0 text-muted-foreground text-xs'>{hint}</span> : null}
          </button>
        </li>
      ))}
    </ul>
  )
}

/** A 15-minute grid: the step that fits a list and that a calendar recognizes. */
const timeSlots = Array.from({ length: 96 }, (_, index) => {
  const hours = String(Math.floor(index / 4)).padStart(2, '0')
  const minutes = String((index % 4) * 15).padStart(2, '0')
  return `${hours}:${minutes}`
})

interface TimeControlProps {
  disabled: boolean
  label: string
  onChange: (time: string) => void
  value: string
}

function TimeSelect({ disabled, label, onChange, value }: Readonly<TimeControlProps>) {
  return (
    <Select
      disabled={disabled}
      onValueChange={(time) => onChange(time ?? '')}
      value={value || null}
    >
      <SelectTrigger aria-label={label} className='w-full min-w-0'>
        <ClockIcon aria-hidden className='size-4 opacity-80' />
        <SelectValue placeholder={label} />
      </SelectTrigger>
      <SelectPopup className='max-h-64'>
        {timeSlots.map((slot) => (
          <SelectItem key={slot} value={slot}>
            {slot}
          </SelectItem>
        ))}
      </SelectPopup>
    </Select>
  )
}

/**
 * The native time field with the clock as an adornment. WebKit's indicator hides
 * because the icon already takes that place, and two clocks in a 130px field
 * compete for the click.
 */
function TimeField({ disabled, label, onChange, value }: Readonly<TimeControlProps>) {
  return (
    <InputGroup className='grow'>
      <InputGroupInput
        aria-label={label}
        className='*:[input]:[&::-webkit-calendar-picker-indicator]:hidden *:[input]:[&::-webkit-calendar-picker-indicator]:appearance-none'
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
        step={900}
        type='time'
        value={value}
      />
      <InputGroupAddon>
        <ClockIcon aria-hidden />
      </InputGroupAddon>
    </InputGroup>
  )
}

function TimeSection({
  onChange,
  timeControl,
  value,
}: Readonly<{
  onChange: (value: ScheduleValue) => void
  timeControl: ScheduleTimeControl
  value: ScheduleValue
}>) {
  const Control = timeControl === 'select' ? TimeSelect : TimeField
  const allDayLabelId = useId()
  return (
    <div className='flex flex-col gap-2 px-2 py-2' data-slot='schedule-time'>
      <div className='grid grid-cols-2 gap-2 *:min-w-0'>
        <Control
          disabled={value.allDay}
          label='Início'
          onChange={(startTime) => onChange({ ...value, startTime })}
          value={value.startTime}
        />
        <Control
          disabled={value.allDay}
          label='Fim'
          onChange={(endTime) => onChange({ ...value, endTime })}
          value={value.endTime}
        />
      </div>
      <div className='flex h-8 items-center justify-between text-sm'>
        <span id={allDayLabelId}>Dia inteiro</span>
        <Switch
          aria-labelledby={allDayLabelId}
          checked={value.allDay}
          onCheckedChange={(allDay) =>
            onChange({
              ...value,
              allDay,
              endTime: allDay ? '' : value.endTime,
              startTime: allDay ? '' : value.startTime,
            })
          }
        />
      </div>
    </div>
  )
}

function RecurrenceSection({
  onChange,
  options,
  value,
}: Readonly<{
  onChange: (value: ScheduleValue) => void
  options: readonly ScheduleRecurrenceOption[]
  value: ScheduleValue
}>) {
  return (
    <div className='flex flex-col gap-2 px-2 py-2' data-slot='schedule-recurrence'>
      <div className='flex h-8 items-center justify-between gap-2 text-sm'>
        Repetir
        <SelectProperty
          ariaLabel='Frequência'
          emptyOptionLabel='Não repete'
          onValueChange={(frequency) =>
            onChange({
              ...value,
              frequency: frequency || null,
              until: frequency ? value.until : null,
            })
          }
          options={options}
          placeholder='Não repete'
          value={value.frequency}
        />
      </div>
      {value.frequency ? (
        <div className='flex h-8 items-center justify-between gap-2 text-sm'>
          Até
          <DateProperty
            allowClear={false}
            ariaLabel='Até'
            fallback='Escolha o término'
            locale='pt-BR'
            onValueChange={(until) => onChange({ ...value, until })}
            value={value.until}
          />
        </div>
      ) : null}
    </div>
  )
}

function FooterToggle({
  active,
  children,
  disabled = false,
  icon: Icon,
  onClick,
}: Readonly<{
  active: boolean
  children: ReactNode
  disabled?: boolean
  icon: typeof ClockIcon
  onClick: () => void
}>) {
  return (
    <Button
      aria-pressed={active}
      className='flex-1'
      disabled={disabled}
      onClick={onClick}
      size='sm'
      type='button'
      variant={active ? 'secondary' : 'ghost'}
    >
      <Icon aria-hidden />
      {children}
    </Button>
  )
}

/**
 * The popup is 288px; seven 40px cells plus the padding add up, and the calendar
 * meets both edges instead of leaving a gutter on the right.
 */
const calendarClassName = 'w-full px-1 [--cell-size:--spacing(10)] sm:[--cell-size:--spacing(10)]'

export interface SchedulePropertyPopupProps {
  /** A single day: no time, no recurrence, no range. It is the shape of a deadline. */
  dateOnly?: boolean
  /**
   * First day that can be picked; the default is today. Picking in the past is a
   * typo, not a choice, and the component prevents it before the value exists —
   * a rule of the picker, not of its host.
   */
  earliest?: Date
  onChange: (value: ScheduleValue) => void
  onDone: () => void
  /**
   * Recurring only makes sense with an anchor in time. The default is the day
   * picked here; the host may recognize another anchor — a deadline — and allow it.
   */
  recurrenceEnabled?: boolean
  recurrenceOptions?: readonly ScheduleRecurrenceOption[]
  /** Como a hora se escolhe: lista de 15 em 15 min ou campo nativo. */
  timeControl?: ScheduleTimeControl
  today?: Date
  value: ScheduleValue
}

/**
 * The dropdown body. A shortcut or a picked day closes the dropdown — setting a
 * date is what the person came to do — unless Time or Repeat is open, because
 * then they are not done yet. Both start closed even with a stored value: the
 * pill already summarizes them.
 */
export function SchedulePropertyPopup({
  dateOnly = false,
  earliest,
  onChange,
  onDone,
  recurrenceEnabled: recurrenceEnabledProp,
  recurrenceOptions = defaultScheduleRecurrenceOptions,
  timeControl = 'select',
  today = startOfLocalDay(new Date()),
  value,
}: Readonly<SchedulePropertyPopupProps>) {
  const recurrenceEnabled = recurrenceEnabledProp ?? Boolean(value.from)
  const notBefore = { before: earliest ?? today }
  const [timeOpen, setTimeOpen] = useState(false)
  const [recurrenceOpen, setRecurrenceOpen] = useState(false)
  const [month, setMonth] = useState(value.from ?? today)
  const presets = buildDayPresets(today)

  const pick = (range: DateRange | undefined) => {
    onChange({
      ...value,
      from: range?.from,
      to: undefined,
      ...(range?.from ? {} : { frequency: null, until: null }),
    })
    if (range?.from) setMonth(range.from)
    if (!timeOpen && !recurrenceOpen) onDone()
  }

  return (
    <div className='flex w-72 flex-col' data-slot='schedule-popup'>
      <div className='flex flex-col'>
        <div className='p-1'>
          <PresetList onPick={pick} presets={presets} />
        </div>
        <Separator className='my-2' />
        <Calendar
          className={calendarClassName}
          disabled={notBefore}
          mode='single'
          month={month}
          onMonthChange={setMonth}
          onSelect={(date) => pick(date ? { from: date } : undefined)}
          selected={value.from}
        />
      </div>
      {dateOnly ? null : (
        <>
          <Separator className='my-2' />
          <div className='flex gap-2 p-2'>
            <FooterToggle
              active={timeOpen}
              icon={ClockIcon}
              onClick={() => setTimeOpen((open) => !open)}
            >
              Hora
            </FooterToggle>
            <FooterToggle
              active={recurrenceOpen}
              disabled={!recurrenceEnabled}
              icon={RepeatIcon}
              onClick={() => setRecurrenceOpen((open) => !open)}
            >
              Repetir
            </FooterToggle>
          </div>
          {timeOpen ? (
            <TimeSection onChange={onChange} timeControl={timeControl} value={value} />
          ) : null}
          {recurrenceOpen && recurrenceEnabled ? (
            <RecurrenceSection onChange={onChange} options={recurrenceOptions} value={value} />
          ) : null}
        </>
      )}
    </div>
  )
}

/** What the pill says at a glance: day, range and time on one line. */
export function formatScheduleProperty(value: ScheduleValue, fallback: string): string {
  if (!value.from) return fallback

  const parts = [
    value.to && value.to.getTime() !== value.from.getTime()
      ? `${formatScheduleDay(value.from)} – ${formatScheduleDay(value.to)}`
      : formatScheduleDay(value.from),
  ]
  if (!value.allDay && value.startTime) {
    parts.push(value.endTime ? `${value.startTime}–${value.endTime}` : value.startTime)
  }

  return parts.join(' · ')
}

/**
 * Recurrence with no end is not recurrence yet: while the person picks the
 * frequency and the "Até" has not arrived, the pill announces nothing.
 */
export function scheduleRecurrenceLabel(
  value: Pick<ScheduleValue, 'frequency' | 'until'>,
  options: readonly ScheduleRecurrenceOption[] = defaultScheduleRecurrenceOptions,
): string | null {
  if (!value.until) return null
  return options.find((option) => option.value === value.frequency)?.label ?? null
}

export interface SchedulePropertyTriggerProps {
  ariaLabel: string
  className?: string
  label: string
  muted: boolean
  /** The frequency spelled out; it enters the accessible name and becomes the repeat glyph. */
  repeatLabel: string | null
  variant?: PropertyVariant
}

/**
 * Recurrence enters the pill as an icon, not as a word: "Semanalmente" next to
 * day and time overflows the sidebar width, and the glyph already says the
 * commitment comes back. The accessible name carries the frequency spelled out.
 */
export function SchedulePropertyTrigger({
  ariaLabel,
  className,
  label,
  muted,
  repeatLabel,
  variant = 'badge',
}: Readonly<SchedulePropertyTriggerProps>) {
  return (
    <PopoverTrigger
      aria-label={`${ariaLabel}: ${label}${repeatLabel ? ` · ${repeatLabel}` : ''}`}
      render={
        <PropertyTrigger
          className={className}
          data-slot='schedule-trigger'
          muted={muted}
          variant={variant}
        />
      }
    >
      <SchedulePropertyContent label={label} repeat={Boolean(repeatLabel)} />
    </PopoverTrigger>
  )
}

function SchedulePropertyContent({ label, repeat }: Readonly<{ label: string; repeat: boolean }>) {
  return (
    <>
      <CalendarIcon aria-hidden className='size-3' />
      <span className='truncate'>{label}</span>
      {repeat ? <RepeatIcon aria-hidden className='size-3' /> : null}
    </>
  )
}

/**
 * The dropdown opens beside the pill with its top on the pill's line and grows
 * downwards — Time and Repeat start below and need floor. It only shifts up when
 * it overflows the screen, and only falls below or above the pill when neither
 * side fits. Shared with whoever mounts the popup from the outside.
 */
export const schedulePopupPlacement = {
  align: 'start',
  className: 'w-auto',
  collisionAvoidance: { align: 'shift', fallbackAxisSide: 'end', side: 'flip' },
  side: 'inline-end',
  sideOffset: 8,
  // Hora e Repetir crescem o popup depois de aberto; sem o Viewport o
  // positioner acompanha e o deslocamento para cima acontece.
  viewport: false,
} satisfies Partial<ComponentProps<typeof PopoverPopup>>

export interface SchedulePropertyProps
  extends Omit<SchedulePropertyPopupProps, 'onChange' | 'onDone'> {
  ariaLabel: string
  className?: string
  fallback?: string
  /** The host discards the draft on close; the popover is the one that knows when it closes. */
  onOpenChange?: (open: boolean) => void
  onValueChange?: (value: ScheduleValue) => void
  readOnly?: boolean
  variant?: PropertyVariant
}

export function ScheduleProperty({
  ariaLabel,
  className,
  fallback = 'Sem data',
  onOpenChange,
  onValueChange,
  readOnly = false,
  recurrenceOptions = defaultScheduleRecurrenceOptions,
  value,
  variant = 'badge',
  ...popupProps
}: Readonly<SchedulePropertyProps>) {
  const [open, setOpen] = useState(false)
  const label = formatScheduleProperty(value, fallback)
  const repeatLabel = scheduleRecurrenceLabel(value, recurrenceOptions)
  const changeOpen = (next: boolean) => {
    setOpen(next)
    onOpenChange?.(next)
  }

  if (readOnly || !onValueChange) {
    return (
      <PropertySurface
        aria-label={`${ariaLabel}: ${label}${repeatLabel ? ` · ${repeatLabel}` : ''}`}
        className={cn('max-w-full', className)}
        data-slot='schedule-property'
        muted={!value.from}
        variant={variant}
      >
        <SchedulePropertyContent label={label} repeat={Boolean(repeatLabel)} />
      </PropertySurface>
    )
  }

  return (
    <Popover onOpenChange={changeOpen} open={open}>
      <SchedulePropertyTrigger
        ariaLabel={ariaLabel}
        className={className}
        label={label}
        muted={!value.from}
        repeatLabel={repeatLabel}
        variant={variant}
      />
      <PopoverPopup {...schedulePopupPlacement}>
        <SchedulePropertyPopup
          {...popupProps}
          onChange={onValueChange}
          onDone={() => changeOpen(false)}
          recurrenceOptions={recurrenceOptions}
          value={value}
        />
      </PopoverPopup>
    </Popover>
  )
}
