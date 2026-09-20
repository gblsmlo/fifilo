import { afterEach, describe, expect, test } from 'bun:test'

await import('../../test/dom')

const { cleanup, fireEvent, render, screen, waitFor } = await import('@testing-library/react')
const { StatusProperty } = await import('./status-property')

afterEach(cleanup)

describe('StatusProperty', () => {
  test('renders the canonical label and icon without consumer options', () => {
    const { container } = render(<StatusProperty readOnly value='inProgress' />)

    expect(screen.getByText('Em andamento')).toBeTruthy()
    expect(container.querySelector('.lucide-circle-dot')).toBeTruthy()
    expect(screen.queryByRole('combobox')).toBeNull()
  })

  test('names the property while no status was recorded', () => {
    const { container } = render(<StatusProperty ariaLabel='Status' readOnly value={null} />)

    const surface = container.querySelector('[data-slot="property-surface"]')
    expect(surface?.getAttribute('aria-label')).toBe('Status')
    expect(surface?.getAttribute('data-empty')).toBe('true')
    expect(screen.getByText('Planejada')).toBeTruthy()
  })

  test('names the recorded status in the accessible name', () => {
    const { container } = render(<StatusProperty ariaLabel='Status' readOnly value='backlog' />)

    const surface = container.querySelector('[data-slot="property-surface"]')
    expect(surface?.getAttribute('aria-label')).toBe('Status: Planejada')
    expect(surface?.getAttribute('data-empty')).toBeNull()
  })

  test('leaves the rest preset unselected in the dropdown when nothing was recorded', async () => {
    render(<StatusProperty ariaLabel='Status' onValueChange={() => undefined} value={null} />)

    const trigger = screen.getByRole('combobox', { name: 'Status' })
    fireEvent.pointerDown(trigger, { pointerId: 1, pointerType: 'mouse' })
    fireEvent.mouseDown(trigger)
    fireEvent.pointerUp(trigger, { pointerId: 1, pointerType: 'mouse' })
    fireEvent.click(trigger)

    const restOption = await waitFor(() => screen.getByRole('option', { name: 'Planejada' }))
    expect(restOption.getAttribute('aria-selected')).toBe('false')
  })

  test('renders the canonical status without badge styling when plain', () => {
    render(<StatusProperty readOnly value='inProgress' variant='plain' />)

    expect(screen.getByText('Em andamento')).toBeTruthy()
  })

  test('keeps the plain variant interactive without restoring badge styling', () => {
    render(
      <StatusProperty
        ariaLabel='Status'
        value='todo'
        variant='plain'
        onValueChange={() => undefined}
      />,
    )

    const trigger = screen.getByRole('combobox', { name: 'Status: Pendente' })
    expect(trigger.className.split(' ')).not.toContain('bg-secondary')
    expect(trigger.dataset.variant).toBe('plain')
  })

  test('renders every canonical status and emits the selected value', async () => {
    const changes: string[] = []
    render(
      <StatusProperty
        ariaLabel='Status'
        value='inProgress'
        onValueChange={(value) => changes.push(value)}
      />,
    )

    const trigger = screen.getByRole('combobox', { name: 'Status: Em andamento' })
    fireEvent.pointerDown(trigger, { pointerId: 1, pointerType: 'mouse' })
    fireEvent.mouseDown(trigger)
    fireEvent.pointerUp(trigger, { pointerId: 1, pointerType: 'mouse' })
    fireEvent.click(trigger)

    expect(screen.getByRole('option', { name: 'Planejada' })).toBeTruthy()
    expect(screen.getByRole('option', { name: 'Pendente' })).toBeTruthy()
    expect(screen.getByRole('option', { name: 'Em andamento' })).toBeTruthy()
    expect(screen.getByRole('option', { name: 'Em revisão' })).toBeTruthy()
    expect(screen.getByRole('option', { name: 'Concluída' })).toBeTruthy()
    expect(screen.getByRole('option', { name: 'Cancelada' })).toBeTruthy()
    expect(screen.getByRole('option', { name: 'Bloqueada' })).toBeTruthy()
    expect(document.body.querySelector('[data-slot="select-item-indicator"]')).toBeNull()

    const doneOption = await waitFor(() => screen.getByRole('option', { name: 'Concluída' }))
    fireEvent.pointerDown(doneOption, { pointerType: 'mouse' })
    fireEvent.click(doneOption)

    expect(changes).toEqual(['done'])
  })

  test('restricts available values without accepting consumer presentation metadata', async () => {
    const changes: Array<{ next: string; previous: string | null }> = []
    render(
      <StatusProperty
        action={(value, context) =>
          changes.push({
            next: value,
            previous: context.previousValue,
          })
        }
        ariaLabel='Status'
        dropdownPlacement={{ align: 'end', side: 'bottom' }}
        value='todo'
        values={['todo', 'inProgress', 'done', 'canceled']}
      />,
    )

    const trigger = screen.getByRole('combobox', { name: 'Status: Pendente' })
    fireEvent.pointerDown(trigger, { pointerId: 1, pointerType: 'mouse' })
    fireEvent.mouseDown(trigger)
    fireEvent.pointerUp(trigger, { pointerId: 1, pointerType: 'mouse' })
    fireEvent.click(trigger)

    expect(screen.queryByRole('option', { name: 'Planejada' })).toBeNull()
    expect(screen.queryByRole('option', { name: 'Em revisão' })).toBeNull()
    expect(screen.queryByRole('option', { name: 'Bloqueada' })).toBeNull()

    const inProgressOption = await waitFor(() =>
      screen.getByRole('option', { name: 'Em andamento' }),
    )
    fireEvent.pointerDown(inProgressOption, { pointerType: 'mouse' })
    fireEvent.click(inProgressOption)

    expect(changes).toEqual([
      {
        next: 'inProgress',
        previous: 'todo',
      },
    ])
  })
})
