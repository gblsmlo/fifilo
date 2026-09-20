import { afterEach, describe, expect, test } from 'bun:test'

await import('../../test/dom')

const { cleanup, render, screen } = await import('@testing-library/react')
const { emptyScheduleValue, formatScheduleProperty, ScheduleProperty } = await import(
  './schedule-property'
)

afterEach(cleanup)

const october26 = new Date(2026, 9, 26)
const october28 = new Date(2026, 9, 28)

describe('formatScheduleProperty', () => {
  test('sem dia devolve o fallback', () => {
    expect(formatScheduleProperty(emptyScheduleValue, 'Sem data')).toBe('Sem data')
  })

  test('an all-day entry is only the day, with no year and no period', () => {
    expect(formatScheduleProperty({ ...emptyScheduleValue, from: october26 }, 'Sem data')).toBe(
      '26 de out',
    )
  })

  test('with a time it joins start and end to the day', () => {
    expect(
      formatScheduleProperty(
        {
          ...emptyScheduleValue,
          allDay: false,
          endTime: '16:00',
          from: october26,
          startTime: '14:00',
        },
        'Sem data',
      ),
    ).toBe('26 de out · 14:00–16:00')
  })

  test('a range shows both ends; an end equal to the start is a single day', () => {
    expect(
      formatScheduleProperty({ ...emptyScheduleValue, from: october26, to: october28 }, 'Sem data'),
    ).toBe('26 de out – 28 de out')
    expect(
      formatScheduleProperty({ ...emptyScheduleValue, from: october26, to: october26 }, 'Sem data'),
    ).toBe('26 de out')
  })
})

describe('ScheduleProperty', () => {
  test('with no handler it is read-only: a surface with no button, with the frequency in the accessible name', () => {
    render(
      <ScheduleProperty
        ariaLabel='Data'
        value={{
          ...emptyScheduleValue,
          frequency: 'weekly',
          from: october26,
          until: '2026-12-18T12:00:00.000Z',
        }}
      />,
    )

    expect(screen.queryByRole('button')).toBeNull()
    expect(screen.getByRole('img', { name: 'Data: 26 de out · Semanalmente' })).toBeTruthy()
  })

  test('a frequency with no end announces no recurrence', () => {
    render(
      <ScheduleProperty
        ariaLabel='Data'
        value={{ ...emptyScheduleValue, frequency: 'weekly', from: october26 }}
      />,
    )

    expect(screen.getByRole('img', { name: 'Data: 26 de out' })).toBeTruthy()
  })

  test('with a handler it becomes a trigger and falls back to the absence tone when empty', () => {
    render(
      <ScheduleProperty
        ariaLabel='Prazo'
        fallback='Sem prazo'
        onValueChange={() => undefined}
        value={emptyScheduleValue}
      />,
    )

    const trigger = screen.getByRole('button', { name: 'Prazo: Sem prazo' })
    expect(trigger.getAttribute('data-empty')).toBe('true')
  })
})
