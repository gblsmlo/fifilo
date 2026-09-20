import { afterEach, describe, expect, test } from 'bun:test'

await import('../../test/dom')

const { cleanup, fireEvent, render, screen, waitFor } = await import('@testing-library/react')
const { DateProperty, formatDateProperty, serializeDatePropertyValue } = await import(
  './date-property'
)

afterEach(cleanup)

describe('DateProperty', () => {
  test('renders a date badge when read-only', () => {
    render(<DateProperty locale='en-US' readOnly timeZone='UTC' value='2026-06-19T12:00:00.000Z' />)

    expect(screen.getByText('Jun 19')).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Date: Jun 19' })).toBeNull()
  })

  test('renders a date without badge styling when plain', () => {
    render(
      <DateProperty
        locale='en-US'
        readOnly
        timeZone='UTC'
        value='2026-06-19T12:00:00.000Z'
        variant='plain'
      />,
    )

    expect(screen.getByText('Jun 19')).toBeTruthy()
  })

  test('opens a calendar popover and clears the date', async () => {
    const changes: Array<string | null> = []
    render(
      <DateProperty
        fallback='No target'
        locale='en-US'
        timeZone='UTC'
        value='2026-06-19T12:00:00.000Z'
        onValueChange={(value) => changes.push(value)}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Date: Jun 19' }))

    expect(await waitFor(() => screen.getByRole('grid'))).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: 'Limpar data' }))

    expect(changes).toEqual([null])
  })

  test('calls the update action with the serialized date and previous value', async () => {
    const changes: Array<{ next: string | null; previous: string | null }> = []
    render(
      <DateProperty
        action={(value, context) =>
          changes.push({
            next: value,
            previous: context.previousValue,
          })
        }
        locale='en-US'
        serializeDate={(date) => date.toISOString()}
        timeZone='UTC'
        value='2026-06-19T12:00:00.000Z'
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Date: Jun 19' }))

    const dayButton = await waitFor(() =>
      screen.getByRole('gridcell', { name: /20/ }).querySelector('button'),
    )
    expect(dayButton).toBeTruthy()
    fireEvent.click(dayButton as HTMLButtonElement)

    expect(changes).toEqual([
      {
        next: '2026-06-20T00:00:00.000Z',
        previous: '2026-06-19T12:00:00.000Z',
      },
    ])
  })

  test('formats invalid or empty values with the fallback', () => {
    expect(formatDateProperty(null, 'No date', 'en-US', 'UTC')).toBe('No date')
    expect(formatDateProperty('not-a-date', 'No date', 'en-US', 'UTC')).toBe('No date')
  })

  test('serializes picked dates as date-only noon UTC values', () => {
    expect(serializeDatePropertyValue(new Date(2026, 5, 19))).toBe('2026-06-19T12:00:00.000Z')
  })
})
