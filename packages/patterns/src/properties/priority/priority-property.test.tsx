import { afterEach, describe, expect, test } from 'bun:test'

await import('../../test/dom')

const { cleanup, fireEvent, render, screen, waitFor } = await import('@testing-library/react')
const { PriorityProperty } = await import('./priority-property')

afterEach(cleanup)

describe('PriorityProperty', () => {
  test('renders the deterministic priority badge without consumer options', () => {
    const { container } = render(<PriorityProperty readOnly value='high' />)

    expect(screen.getByText('Alta')).toBeTruthy()
    expect(container.querySelector('.lucide-flag')).toBeTruthy()
    expect(screen.queryByRole('combobox')).toBeNull()
  })

  /**
   * The structure that produces the icon-only mode: the label stays in the DOM,
   * marked to disappear from the screen. That it *does* disappear, and that the
   * accessible name survives, is measured in the story — it depends on layout
   * and on the tree.
   */
  test('hideLabel keeps the label in the DOM, marked as screen-reader only', () => {
    const { container } = render(<PriorityProperty hideLabel readOnly value='urgent' />)

    const label = screen.getByText('Urgente')
    expect(label.className).toContain('sr-only')
    expect(container.querySelector('.lucide-flag')).toBeTruthy()
  })

  test('names the property while no priority was recorded', () => {
    const { container } = render(<PriorityProperty ariaLabel='Prioridade' readOnly value={null} />)

    const surface = container.querySelector('[data-slot="property-surface"]')
    expect(surface?.getAttribute('aria-label')).toBe('Prioridade')
    expect(surface?.getAttribute('data-empty')).toBe('true')
    expect(screen.getByText('Sem prioridade')).toBeTruthy()
  })

  test('treats a recorded no_priority as a value', () => {
    const { container } = render(
      <PriorityProperty ariaLabel='Prioridade' readOnly value='no_priority' />,
    )

    const surface = container.querySelector('[data-slot="property-surface"]')
    expect(surface?.getAttribute('aria-label')).toBe('Prioridade: Sem prioridade')
    expect(surface?.getAttribute('data-empty')).toBeNull()
  })

  test('leaves the rest preset unselected in the dropdown when nothing was recorded', async () => {
    render(<PriorityProperty ariaLabel='Prioridade' onValueChange={() => undefined} value={null} />)

    const trigger = screen.getByRole('combobox', { name: 'Prioridade' })
    fireEvent.pointerDown(trigger, { pointerId: 1, pointerType: 'mouse' })
    fireEvent.mouseDown(trigger)
    fireEvent.pointerUp(trigger, { pointerId: 1, pointerType: 'mouse' })
    fireEvent.click(trigger)

    const restOption = await waitFor(() => screen.getByRole('option', { name: 'Sem prioridade' }))
    expect(restOption.getAttribute('aria-selected')).toBe('false')
  })

  test('renders the deterministic priority without badge styling when plain', () => {
    render(<PriorityProperty readOnly value='high' variant='plain' />)

    expect(screen.getByText('Alta')).toBeTruthy()
  })

  test('renders every deterministic option and emits the selected priority', async () => {
    const changes: string[] = []
    render(
      <PriorityProperty
        action={(value) => changes.push(value)}
        ariaLabel='Prioridade'
        value='high'
      />,
    )

    const trigger = screen.getByRole('combobox', { name: 'Prioridade: Alta' })
    fireEvent.pointerDown(trigger, { pointerId: 1, pointerType: 'mouse' })
    fireEvent.mouseDown(trigger)
    fireEvent.pointerUp(trigger, { pointerId: 1, pointerType: 'mouse' })
    fireEvent.click(trigger)

    expect(screen.getByRole('option', { name: 'Sem prioridade' })).toBeTruthy()
    expect(screen.getByRole('option', { name: 'Urgente' })).toBeTruthy()
    expect(screen.getByRole('option', { name: 'Alta' })).toBeTruthy()
    expect(screen.getByRole('option', { name: 'Média' })).toBeTruthy()
    expect(screen.getByRole('option', { name: 'Baixa' })).toBeTruthy()
    expect(document.body.querySelector('[data-slot="select-item-indicator"]')).toBeNull()

    const lowOption = await waitFor(() => screen.getByRole('option', { name: 'Baixa' }))
    fireEvent.pointerDown(lowOption, { pointerType: 'mouse' })
    fireEvent.click(lowOption)

    expect(changes).toEqual(['low'])
  })

  test('can hide the no priority sentinel without custom consumer options', async () => {
    render(
      <PriorityProperty
        includeNoPriority={false}
        ariaLabel='Prioridade'
        value='high'
        onValueChange={() => undefined}
      />,
    )

    const trigger = screen.getByRole('combobox', { name: 'Prioridade: Alta' })
    fireEvent.pointerDown(trigger, { pointerId: 1, pointerType: 'mouse' })
    fireEvent.mouseDown(trigger)
    fireEvent.pointerUp(trigger, { pointerId: 1, pointerType: 'mouse' })
    fireEvent.click(trigger)

    expect(screen.queryByRole('option', { name: 'Sem prioridade' })).toBeNull()
    expect(await waitFor(() => screen.getByRole('option', { name: 'Urgente' }))).toBeTruthy()
    expect(screen.getByRole('option', { name: 'Alta' })).toBeTruthy()
    expect(screen.getByRole('option', { name: 'Média' })).toBeTruthy()
    expect(screen.getByRole('option', { name: 'Baixa' })).toBeTruthy()
  })
})
