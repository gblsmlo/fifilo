import { afterEach, describe, expect, test } from 'bun:test'

await import('../../test/dom')

Object.assign(globalThis, { NodeFilter: window.NodeFilter })

const { cleanup, fireEvent, render, screen } = await import('@testing-library/react')
const { TagsProperty } = await import('./tags-property')

afterEach(cleanup)

const options = [
  { label: 'Documentos', value: 'documents' },
  { label: 'Retorno', value: 'return' },
] as const

describe('TagsProperty', () => {
  test('marks the read-only row as empty while no tag was chosen', () => {
    const { container, rerender } = render(
      <TagsProperty
        ariaLabel='Tags da tarefa'
        options={options}
        placeholder='Sem tags'
        readOnly
        value={[]}
      />,
    )

    expect(
      container.querySelector('[data-slot="property-surface"]')?.getAttribute('data-empty'),
    ).toBe('true')

    rerender(
      <TagsProperty
        ariaLabel='Tags da tarefa'
        options={options}
        placeholder='Sem tags'
        readOnly
        value={['documents']}
      />,
    )

    expect(
      container.querySelector('[data-slot="property-surface"]')?.getAttribute('data-empty'),
    ).toBeNull()
  })

  test('uses a labelled chip to open the editing controls', () => {
    const { container } = render(
      <TagsProperty
        ariaLabel='Tags da tarefa'
        onValueChange={() => undefined}
        options={options}
        value={[]}
      />,
    )

    const trigger = screen.getByRole('button', { name: 'Adicionar tag' })
    expect(trigger).toBeTruthy()
    // With no tag at all the trigger explains itself: a chip labelled with the
    // tag icon, and the accessible name comes from the visible text.
    expect(trigger.textContent).toContain('Adicionar tag')
    expect(trigger.querySelectorAll('svg')).toHaveLength(1)
    expect(trigger.querySelector('svg')?.classList.contains('lucide-tag')).toBe(true)
    expect(trigger.className).toContain('rounded-full')
    expect(trigger.className).toContain('h-6')
    expect(container.querySelector('[data-slot="combobox-chips"]')?.lastElementChild).toBe(trigger)

    fireEvent.click(trigger)
    expect(screen.getByRole('button', { name: 'Adicionar tag' })).toBeTruthy()
    expect(screen.queryByRole('combobox', { name: 'Tags da tarefa' })).toBeNull()
  })

  test('speaks the vocabulary of the collection when it is not tags', () => {
    render(
      <TagsProperty
        addLabel='Adicionar lembrete'
        ariaLabel='Lembretes'
        onValueChange={() => undefined}
        options={options}
        removeLabel={(label) => `Remover lembrete ${label}`}
        value={['documents']}
      />,
    )

    expect(screen.getByRole('button', { name: 'Adicionar lembrete' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Remover lembrete Documentos' })).toBeTruthy()
    expect(screen.queryByRole('button', { name: /tag/ })).toBeNull()
  })

  test('shrinks the trigger to the plus once the row already has tags', () => {
    render(
      <TagsProperty
        ariaLabel='Tags da tarefa'
        onValueChange={() => undefined}
        options={options}
        value={[options[0].value]}
      />,
    )

    const trigger = screen.getByRole('button', { name: 'Adicionar tag' })

    // With a tag next to it the context is already given: only the add sign remains.
    expect(trigger.textContent).toBe('')
    expect(trigger.querySelector('svg')?.classList.contains('lucide-plus')).toBe(true)
    expect(trigger.className).toContain('w-6')
  })

  test('renders the editable multi-value collection as a plain property', () => {
    const { container } = render(
      <TagsProperty
        ariaLabel='Tags da tarefa'
        onValueChange={() => undefined}
        options={options}
        value={['documents']}
        variant='plain'
      />,
    )

    expect(screen.getByRole('button', { name: 'Adicionar tag' })).toBeTruthy()
    expect(screen.getByText('Documentos')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Remover tag Documentos' })).toBeTruthy()
    expect(
      container.querySelector<HTMLElement>('[data-slot="tags-property"]')?.dataset.variant,
    ).toBe('plain')
    expect(container.querySelector('[data-slot="combobox-chips"]')?.className).toContain(
      'bg-transparent!',
    )
  })

  test('uses plain as the default visual variant', () => {
    const { container } = render(
      <TagsProperty onValueChange={() => undefined} options={options} value={['documents']} />,
    )

    expect(
      container.querySelector<HTMLElement>('[data-slot="tags-property"]')?.dataset.variant,
    ).toBe('plain')
  })

  test('renders editable tags with secondary badge styling', () => {
    const { container } = render(
      <TagsProperty onValueChange={() => undefined} options={options} value={['documents']} />,
    )

    const tag = container.querySelector('[data-slot="combobox-chip"]')

    expect(tag?.className).toContain('bg-secondary')
    expect(tag?.className).toContain('text-secondary-foreground')
    expect(tag?.className).toContain('rounded-full')
  })

  test('returns the next collection when an option is selected', async () => {
    const values: string[][] = []
    render(
      <TagsProperty
        ariaLabel='Tags da tarefa'
        onValueChange={(value) => values.push(Array.from(value))}
        options={options}
        value={['documents']}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Adicionar tag' }))
    const option = await screen.findByRole('option', { name: 'Retorno' })
    fireEvent.pointerDown(option, { pointerType: 'mouse' })
    fireEvent.click(option)

    expect(values).toEqual([['documents', 'return']])
  })

  test('opens the available options without a search field', async () => {
    render(
      <TagsProperty
        ariaLabel='Tags da tarefa'
        onValueChange={() => undefined}
        options={options}
        value={[]}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Adicionar tag' }))
    expect(screen.queryByRole('combobox', { name: 'Tags da tarefa' })).toBeNull()
    expect(await screen.findByRole('option', { name: 'Documentos' })).toBeTruthy()

    const popup = document.querySelector<HTMLElement>('[data-slot="combobox-positioner"] > span')
    expect(popup?.className).toContain('w-64')
    expect(popup?.className).toContain('min-w-0!')
    expect(
      document.querySelector<HTMLElement>('[data-slot="combobox-positioner"]')?.dataset.align,
    ).toBe('end')
  })

  test('keeps read-only tags out of the editing controls', () => {
    render(<TagsProperty options={options} readOnly value={['documents']} variant='plain' />)

    expect(screen.getByText('Documentos')).toBeTruthy()
    expect(screen.queryByRole('combobox')).toBeNull()
    expect(screen.queryByRole('button', { name: 'Remover tag Documentos' })).toBeNull()
  })

  test('shows the count trigger without a tag as "Sem Tag"', () => {
    render(
      <TagsProperty
        ariaLabel='Tags da tarefa'
        display='count'
        onValueChange={() => undefined}
        options={options}
        value={[]}
      />,
    )

    const trigger = screen.getByRole('button', { name: 'Tags da tarefa' })
    expect(trigger.textContent).toBe('Sem Tag')
    expect(trigger.querySelector('svg')).toBeNull()
  })

  test('shows the count trigger with one tag in the singular', () => {
    render(
      <TagsProperty
        ariaLabel='Tags da tarefa'
        display='count'
        onValueChange={() => undefined}
        options={options}
        value={[options[0].value]}
      />,
    )

    const trigger = screen.getByRole('button', { name: 'Tags da tarefa' })
    expect(trigger.textContent).toBe('Tag1')
    expect(trigger.querySelector('svg')?.classList.contains('lucide-tag')).toBe(true)
  })

  test('shows the count trigger with more than one tag in the plural', () => {
    render(
      <TagsProperty
        ariaLabel='Tags da tarefa'
        display='count'
        onValueChange={() => undefined}
        options={options}
        value={options.map((option) => option.value)}
      />,
    )

    const trigger = screen.getByRole('button', { name: 'Tags da tarefa' })
    expect(trigger.textContent).toBe('Tags2')
  })

  test('opens the multi-select popup from the count trigger, like its peers', async () => {
    render(
      <TagsProperty
        ariaLabel='Tags da tarefa'
        display='count'
        onValueChange={() => undefined}
        options={options}
        value={[]}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Tags da tarefa' }))
    expect(await screen.findByRole('option', { name: 'Documentos' })).toBeTruthy()
    expect(await screen.findByRole('option', { name: 'Retorno' })).toBeTruthy()
  })
})
