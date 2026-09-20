import { afterEach, describe, expect, test } from 'bun:test'

await import('../../test/dom')

const { cleanup, fireEvent, render, screen, waitFor } = await import('@testing-library/react')
const { DateRangeProperty, formatDateRangeProperty } = await import('./date-range-property')
type DateRange = import('react-day-picker').DateRange

// Local day markers, which is what the calendar hands back — building them in UTC
// would make the label assertions depend on the machine's time zone.
const march = new Date(2026, 2, 2)
const april = new Date(2026, 3, 15)

afterEach(cleanup)

describe('DateRangeProperty', () => {
  test('joins both ends into a single label', () => {
    render(<DateRangeProperty locale='en-US' readOnly value={{ from: march, to: april }} />)

    expect(screen.getByText('Mar 2 – Apr 15')).toBeTruthy()
  })

  test('names an open-ended range by the end it has', () => {
    const { rerender } = render(
      <DateRangeProperty locale='en-US' readOnly value={{ from: march, to: undefined }} />,
    )
    expect(screen.getByText('A partir de Mar 2')).toBeTruthy()

    rerender(<DateRangeProperty locale='en-US' readOnly value={{ from: undefined, to: april }} />)
    expect(screen.getByText('Até Apr 15')).toBeTruthy()
  })

  test('falls back when neither end is set', () => {
    render(<DateRangeProperty fallback='Sem período' readOnly value={undefined} />)

    expect(screen.getByText('Sem período')).toBeTruthy()
  })

  test('stays a badge without onValueChange, even when not marked read-only', () => {
    render(<DateRangeProperty locale='en-US' value={{ from: march, to: april }} />)

    expect(screen.queryByRole('button', { name: /Period/ })).toBeNull()
  })

  test('completes the range from the open end', async () => {
    const changes: (DateRange | undefined)[] = []
    render(
      <DateRangeProperty
        ariaLabel='Período'
        locale='en-US'
        onValueChange={(value) => changes.push(value)}
        value={{ from: march, to: undefined }}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Período: A partir de Mar 2' }))

    // Two months in the popover: "11" shows up in each one, and the first is the
    // month that already holds the chosen start.
    const dayButton = await waitFor(() =>
      screen.getAllByRole('gridcell', { name: /^11$/ })[0]?.querySelector('button'),
    )
    fireEvent.click(dayButton as HTMLButtonElement)

    expect(changes.at(-1)?.from?.toISOString()).toBe(march.toISOString())
    expect(changes.at(-1)?.to?.getDate()).toBe(11)
  })

  test('stays open after the first click, which returns both ends on the same day', async () => {
    const changes: (DateRange | undefined)[] = []
    render(
      <DateRangeProperty
        ariaLabel='Período'
        locale='en-US'
        onValueChange={(value) => changes.push(value)}
        value={undefined}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Período: Sem período' }))
    const first = await waitFor(() =>
      screen.getAllByRole('gridcell', { name: /^11$/ })[0]?.querySelector('button'),
    )
    fireEvent.click(first as HTMLButtonElement)

    // The calendar returns the degenerate range on the first click; closing here
    // would only ever allow a single day.
    expect(changes.at(-1)?.from).toBeTruthy()
    expect(screen.getAllByRole('gridcell').length).toBeGreaterThan(0)
  })

  test('clears both ends at once', async () => {
    const changes: (DateRange | undefined)[] = []
    render(
      <DateRangeProperty
        ariaLabel='Período'
        locale='en-US'
        onValueChange={(value) => changes.push(value)}
        value={{ from: march, to: april }}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Período: Mar 2 – Apr 15' }))
    await waitFor(() => expect(screen.getByText('Limpar período')).toBeTruthy())
    fireEvent.click(screen.getByText('Limpar período'))

    expect(changes.at(-1)).toBeUndefined()
  })

  test('formats without rendering', () => {
    expect(formatDateRangeProperty({ from: march, to: april }, 'x', 'en-US')).toBe('Mar 2 – Apr 15')
    expect(formatDateRangeProperty(undefined, 'Sem período', 'en-US')).toBe('Sem período')
  })
})
