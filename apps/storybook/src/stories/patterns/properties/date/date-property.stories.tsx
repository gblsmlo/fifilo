import { DateProperty } from '@fifilo/patterns/properties'
import { Badge as UiBadge } from '@fifilo/ui/components/badge'
import { Button } from '@fifilo/ui/components/button'
import { Calendar } from '@fifilo/ui/components/calendar'
import { Input } from '@fifilo/ui/components/input'
import { Popover, PopoverPopup, PopoverTrigger } from '@fifilo/ui/components/popover'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { CalendarDaysIcon } from 'lucide-react'
import { useState } from 'react'
import { expectBadgeSurface, expectPlainSurface } from '../../../../test-utils/property-surface'
import { booleanArgType, propertyArgTypes } from '../../../../test-utils/story-arg-types'

const meta = {
  argTypes: {
    ...propertyArgTypes,
    allowClear: booleanArgType,
    isOverdue: booleanArgType,
  },
  component: DateProperty,
  parameters: {
    docs: {
      description: {
        component:
          'Unidade de propriedade de data para prazo, início, alvo ou marco auditável. Badge é a superfície padrão e plain remove o badge; quando editável, a superfície escolhida abre um Popover com Calendar.',
      },
    },
  },
  tags: ['autodocs'],
  title: 'Patterns/Properties/Date',
} satisfies Meta<typeof DateProperty>

export default meta

type Story = StoryObj<typeof DateProperty>

export const Default: Story = {
  play: async ({ canvasElement }) => {
    await expectBadgeSurface(canvasElement)
  },
  args: {
    locale: 'en-US',
    timeZone: 'UTC',
    value: '2026-06-19T12:00:00.000Z',
  },
}

export const Plain: Story = {
  play: async ({ canvasElement }) => {
    await expectPlainSurface(canvasElement)
  },
  args: {
    locale: 'en-US',
    timeZone: 'UTC',
    value: '2026-06-19T12:00:00.000Z',
    variant: 'plain',
  },
}

export const Empty: Story = {
  args: {
    fallback: 'No target',
    value: null,
  },
}

export const Overdue: Story = {
  args: {
    isOverdue: true,
    locale: 'en-US',
    timeZone: 'UTC',
    value: '2026-06-12T12:00:00.000Z',
  },
}

export const Trigger: Story = {
  parameters: {
    docs: {
      description: {
        story:
          'Caso de uso editável: o badge funciona como trigger e abre um calendário em Popover. Use dropdownPlacement para ajustar side/align/offset no consumer.',
      },
    },
  },
  render: () => <DatePropertyPickerStory />,
}

export const DateAndTime: Story = {
  parameters: {
    docs: {
      description: {
        story:
          'Spec for a property that needs date and time in the same value. The consumer composes the property badge trigger, Calendar, and a time input, then serializes the result as a full ISO datetime.',
      },
    },
  },
  render: () => <DateTimePropertyStory />,
}

function DateTimePropertyStory() {
  const [value, setValue] = useState<string | null>('2026-06-19T14:30:00.000Z')
  const selectedDate = parseStoryDate(value) ?? new Date('2026-06-19T14:30:00.000Z')
  const [draftDate, setDraftDate] = useState<Date>(selectedDate)
  const [draftTime, setDraftTime] = useState(formatTimeInputValue(selectedDate))
  const label = formatDateTimePropertyLabel(value, 'Schedule')

  const handleDateSelect = (date: Date | undefined) => {
    if (!date) return
    setDraftDate(date)
    setValue(serializeDateTimeValue(date, draftTime))
  }

  const handleTimeChange = (nextTime: string) => {
    setDraftTime(nextTime)
    setValue(serializeDateTimeValue(draftDate, nextTime))
  }

  const handleClear = () => {
    setValue(null)
  }

  return (
    <div className='flex min-h-104 items-start p-16'>
      <Popover>
        <PopoverTrigger
          aria-label={`Schedule: ${label}`}
          render={
            <UiBadge className='max-w-full' render={<button type='button' />} variant='secondary' />
          }
        >
          <CalendarDaysIcon aria-hidden className='size-3' />
          <span className='truncate'>{label}</span>
        </PopoverTrigger>
        <PopoverPopup align='start' className='w-auto' side='bottom' sideOffset={8}>
          <Calendar
            defaultMonth={draftDate}
            mode='single'
            selected={draftDate}
            onSelect={handleDateSelect}
          />
          <div className='grid gap-2 border-t p-2'>
            <label className='grid gap-1 px-1 text-sm' htmlFor='date-time-property-time'>
              <span className='font-medium text-muted-foreground text-xs'>Time</span>
              <Input
                aria-label='Schedule time'
                id='date-time-property-time'
                nativeInput
                type='time'
                value={draftTime}
                onChange={(event) => handleTimeChange(event.currentTarget.value)}
              />
            </label>
            <div className='flex items-center justify-between gap-2'>
              <span className='min-w-0 truncate px-1 text-muted-foreground text-sm'>{label}</span>
              <Button size='sm' type='button' variant='ghost' onClick={handleClear}>
                Clear
              </Button>
            </div>
          </div>
        </PopoverPopup>
      </Popover>
    </div>
  )
}

function DatePropertyPickerStory() {
  const [value, setValue] = useState<string | null>('2026-06-19T12:00:00.000Z')

  return (
    <div className='flex min-h-80 items-start p-4'>
      <DateProperty
        ariaLabel='Target date'
        fallback='No target'
        locale='en-US'
        timeZone='UTC'
        value={value}
        onValueChange={setValue}
      />
    </div>
  )
}

function formatDateTimePropertyLabel(value: string | null, fallback: string): string {
  const date = parseStoryDate(value)
  if (!date) return fallback
  return new Intl.DateTimeFormat('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'UTC',
  }).format(date)
}

function formatTimeInputValue(date: Date): string {
  const hours = date.getUTCHours().toString().padStart(2, '0')
  const minutes = date.getUTCMinutes().toString().padStart(2, '0')
  return `${hours}:${minutes}`
}

function parseStoryDate(value: string | null): Date | null {
  if (!value) return null
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return null
  return date
}

function serializeDateTimeValue(date: Date, time: string): string {
  const [hours = '00', minutes = '00'] = time.split(':')
  return new Date(
    Date.UTC(
      date.getUTCFullYear(),
      date.getUTCMonth(),
      date.getUTCDate(),
      Number(hours),
      Number(minutes),
    ),
  ).toISOString()
}
