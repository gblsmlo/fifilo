import { afterEach, describe, expect, test } from 'bun:test'

await import('../../test/dom')

const { cleanup, fireEvent, render, screen, waitFor } = await import('@testing-library/react')
const { SelectProperty } = await import('./select-property')

afterEach(cleanup)

const options = [
  { label: 'Reunião', value: 'meeting' },
  { label: 'Ligação', value: 'call' },
  { label: 'Outro', value: 'other' },
]

describe('SelectProperty', () => {
  test('stays a value while nobody can change it', () => {
    const { container } = render(
      <SelectProperty ariaLabel='Tipo' options={options} value='meeting' />,
    )

    const surface = container.querySelector('[data-slot="property-surface"]')
    expect(surface?.getAttribute('role')).toBe('img')
    expect(surface?.getAttribute('aria-label')).toBe('Tipo: Reunião')
    // With no handler there is no selector: a read-only property does not simulate editing.
    expect(screen.queryByRole('combobox')).toBeNull()
  })

  test('becomes a trigger once the consumer can persist the choice', () => {
    render(
      <SelectProperty ariaLabel='Tipo' action={() => undefined} options={options} value='call' />,
    )

    expect(screen.getByRole('combobox', { name: 'Tipo: Ligação' })).toBeTruthy()
  })

  test('reports the chosen value with the one it replaced', async () => {
    const changes: { value: string | null; previous: string | null }[] = []
    render(
      <SelectProperty
        ariaLabel='Tipo'
        action={(value, context) => changes.push({ previous: context.previousValue, value })}
        options={options}
        value='call'
      />,
    )

    const trigger = screen.getByRole('combobox', { name: 'Tipo: Ligação' })
    fireEvent.pointerDown(trigger, { pointerId: 1, pointerType: 'mouse' })
    fireEvent.mouseDown(trigger)
    fireEvent.pointerUp(trigger, { pointerId: 1, pointerType: 'mouse' })
    fireEvent.click(trigger)

    const option = await waitFor(() => screen.getByRole('option', { name: 'Outro' }))
    fireEvent.pointerDown(option, { pointerType: 'mouse' })
    fireEvent.click(option)

    expect(changes).toEqual([{ previous: 'call', value: 'other' }])
  })

  test('names the property while nothing is chosen', () => {
    const { container } = render(
      <SelectProperty ariaLabel='Tipo' options={options} placeholder='Tipo' value={null} />,
    )

    const surface = container.querySelector('[data-slot="property-surface"]')
    // With no value the accessible name is only the property, without repeating the placeholder.
    expect(surface?.getAttribute('aria-label')).toBe('Tipo')
    // And the text falls back to the secondary tone: absence does not read as a value.
    expect(surface?.getAttribute('data-empty')).toBe('true')
    expect(surface?.className).toContain('text-muted-foreground')
    expect(container.textContent).toContain('Tipo')
  })

  test('offers going back to no value and reports it as null', async () => {
    const changes: (string | null)[] = []
    render(
      <SelectProperty
        action={(value) => changes.push(value)}
        ariaLabel='Tipo'
        emptyOptionLabel='Sem tipo'
        options={options}
        placeholder='Tipo'
        value='call'
      />,
    )

    const trigger = screen.getByRole('combobox', { name: 'Tipo: Ligação' })
    fireEvent.pointerDown(trigger, { pointerId: 1, pointerType: 'mouse' })
    fireEvent.mouseDown(trigger)
    fireEvent.pointerUp(trigger, { pointerId: 1, pointerType: 'mouse' })
    fireEvent.click(trigger)

    const emptyOptionItem = await waitFor(() => screen.getByRole('option', { name: 'Sem tipo' }))
    fireEvent.pointerDown(emptyOptionItem, { pointerType: 'mouse' })
    fireEvent.click(emptyOptionItem)

    // Absence is `null`, not an empty string leaking to the consumer.
    expect(changes).toEqual([null])
  })

  test('falls back when the current value is outside the catalog', () => {
    const { container } = render(
      <SelectProperty
        ariaLabel='Tipo'
        fallback='Não informado'
        options={options}
        value='desconhecido'
      />,
    )

    expect(container.textContent).toContain('Não informado')
    expect(
      container.querySelector('[data-slot="property-surface"]')?.getAttribute('aria-label'),
    ).toBe('Tipo: Não informado')
  })
})
