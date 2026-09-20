import { afterEach, describe, expect, test } from 'bun:test'

await import('../../test/dom')

Object.assign(globalThis, { NodeFilter: window.NodeFilter })

const { cleanup, fireEvent, render, screen } = await import('@testing-library/react')
const { PeopleProperty } = await import('./people-property')

afterEach(cleanup)

const options = [
  { label: 'Bruno Lima', value: 'person-1' },
  { label: 'Ana Souza', value: 'person-2' },
] as const

describe('PeopleProperty', () => {
  test('labels the trigger with the placeholder when nobody is applied', () => {
    render(
      <PeopleProperty
        ariaLabel='Participantes da tarefa'
        onValueChange={() => undefined}
        options={options}
        value={[]}
      />,
    )

    const trigger = screen.getByRole('combobox', { name: 'Participantes da tarefa' })
    expect(trigger.textContent).toContain('Adicionar pessoa')
  })

  test('shows the first person by name and the rest as a count', () => {
    const { container } = render(
      <PeopleProperty
        ariaLabel='Participantes da tarefa'
        onValueChange={() => undefined}
        options={options}
        value={['person-1', 'person-2']}
      />,
    )

    const trigger = screen.getByRole('combobox', { name: 'Participantes da tarefa' })
    expect(trigger.textContent).toContain('Bruno Lima')
    expect(trigger.textContent).toContain('+1')
    expect(trigger.textContent).not.toContain('Ana Souza')
    expect(container.querySelector('[data-slot="avatar"]')).toBeTruthy()
  })

  test('returns the next collection when a person is selected', async () => {
    const values: string[][] = []
    render(
      <PeopleProperty
        ariaLabel='Participantes da tarefa'
        onValueChange={(value) => values.push(Array.from(value))}
        options={options}
        value={['person-1']}
      />,
    )

    fireEvent.click(screen.getByRole('combobox', { name: 'Participantes da tarefa' }))
    const option = await screen.findByRole('option', { name: /Ana Souza/ })
    fireEvent.pointerDown(option, { pointerType: 'mouse' })
    fireEvent.click(option)

    expect(values).toEqual([['person-1', 'person-2']])
  })

  test('returns the next collection when an applied person is deselected', async () => {
    const values: string[][] = []
    render(
      <PeopleProperty
        ariaLabel='Participantes da tarefa'
        onValueChange={(value) => values.push(Array.from(value))}
        options={options}
        value={['person-1', 'person-2']}
      />,
    )

    fireEvent.click(screen.getByRole('combobox', { name: 'Participantes da tarefa' }))
    const option = await screen.findByRole('option', { name: /Bruno Lima/ })
    fireEvent.pointerDown(option, { pointerType: 'mouse' })
    fireEvent.click(option)

    expect(values).toEqual([['person-2']])
  })

  test('keeps read-only people out of the editing controls', () => {
    render(<PeopleProperty options={options} readOnly value={['person-1']} />)

    expect(screen.getByText('Bruno Lima')).toBeTruthy()
    expect(screen.queryByRole('combobox')).toBeNull()
  })

  test('shows a placeholder when nobody is applied and there is nothing to change', () => {
    render(<PeopleProperty options={options} readOnly value={[]} />)

    expect(screen.getByText('Adicionar pessoa')).toBeTruthy()
  })
})
