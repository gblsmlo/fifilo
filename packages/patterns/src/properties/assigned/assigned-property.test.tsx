import { afterEach, describe, expect, test } from 'bun:test'

await import('../../test/dom')

const { cleanup, fireEvent, render, screen, waitFor } = await import('@testing-library/react')
const { AssignedProperty } = await import('./assigned-property')

afterEach(cleanup)

const options = [
  { fallback: 'AM', label: 'Ana Martins', supportingLabel: 'Ops', value: 'ana' },
  { fallback: 'GM', label: 'Gabriel Melo', supportingLabel: 'Owner', value: 'gabriel' },
  { fallback: 'MS', label: 'Marina Souza', supportingLabel: 'Comercial', value: 'marina' },
] as const

describe('AssignedProperty', () => {
  test('renders an assigned badge when read-only', () => {
    render(<AssignedProperty options={options} readOnly value='gabriel' />)

    expect(screen.getByText('Gabriel Melo')).toBeTruthy()
    expect(screen.queryByRole('combobox')).toBeNull()
  })

  test('renders an assignee without badge styling when plain', () => {
    render(<AssignedProperty options={options} readOnly value='gabriel' variant='plain' />)

    expect(screen.getByText('Gabriel Melo')).toBeTruthy()
  })

  test('renders every assignee option without selected check indicator', async () => {
    const changes: string[] = []
    render(
      <AssignedProperty
        ariaLabel='Assigned'
        options={options}
        value='gabriel'
        onValueChange={(value) => changes.push(value)}
      />,
    )

    const trigger = screen.getByRole('combobox', { name: 'Assigned: Gabriel Melo' })
    fireEvent.pointerDown(trigger, { pointerId: 1, pointerType: 'mouse' })
    fireEvent.mouseDown(trigger)
    fireEvent.pointerUp(trigger, { pointerId: 1, pointerType: 'mouse' })
    fireEvent.click(trigger)

    expect(await waitFor(() => screen.getByRole('option', { name: 'Ana Martins' }))).toBeTruthy()
    expect(screen.getByRole('option', { name: 'Gabriel Melo' })).toBeTruthy()
    expect(screen.getByRole('option', { name: 'Marina Souza' })).toBeTruthy()
    expect(document.body.querySelector('[data-slot="select-item-indicator"]')).toBeNull()

    const marinaOption = screen.getByRole('option', { name: 'Marina Souza' })
    fireEvent.pointerDown(marinaOption, { pointerType: 'mouse' })
    fireEvent.click(marinaOption)

    expect(changes).toEqual(['marina'])
  })

  test('calls the update action with selected assignee and previous value', async () => {
    const changes: Array<{ next: string; previous: string | null; label: string }> = []
    render(
      <AssignedProperty
        action={(value, context) =>
          changes.push({
            label: context.option.label,
            next: value,
            previous: context.previousValue,
          })
        }
        ariaLabel='Assigned'
        dropdownPlacement={{ align: 'end', side: 'bottom' }}
        options={options}
        value='ana'
      />,
    )

    const trigger = screen.getByRole('combobox', { name: 'Assigned: Ana Martins' })
    fireEvent.pointerDown(trigger, { pointerId: 1, pointerType: 'mouse' })
    fireEvent.mouseDown(trigger)
    fireEvent.pointerUp(trigger, { pointerId: 1, pointerType: 'mouse' })
    fireEvent.click(trigger)

    const gabrielOption = await waitFor(() => screen.getByRole('option', { name: 'Gabriel Melo' }))
    fireEvent.pointerDown(gabrielOption, { pointerType: 'mouse' })
    fireEvent.click(gabrielOption)

    expect(changes).toEqual([
      {
        label: 'Gabriel Melo',
        next: 'gabriel',
        previous: 'ana',
      },
    ])
  })
})
