import { afterEach, describe, expect, test } from 'bun:test'

await import('../../test/dom')

const { cleanup, fireEvent, render, screen } = await import('@testing-library/react')
const { PropertyCollection } = await import('./property-collection')

afterEach(cleanup)

const items = [
  { defaultVisible: true, id: 'status', label: 'Status', render: () => <span>Em progresso</span> },
  {
    defaultVisible: true,
    id: 'assignee',
    label: 'Responsável',
    render: () => <span>Definir responsável</span>,
  },
  { id: 'tags', label: 'Etiquetas', render: () => <span>Adicionar etiqueta</span> },
] as const

describe('PropertyCollection', () => {
  test('renders only the default-visible properties, in catalog order', () => {
    render(<PropertyCollection ariaLabel='Propriedades da Task' items={items} />)

    const group = screen.getByRole('group', { name: 'Propriedades da Task' })
    expect(group.textContent).toContain('Em progresso')
    expect(group.textContent).toContain('Definir responsável')
    expect(group.textContent).not.toContain('Adicionar etiqueta')
  })

  test('defaultVisible on the container overrides the items flags', () => {
    render(<PropertyCollection defaultVisible={['tags']} items={items} />)

    expect(screen.queryByText('Em progresso')).toBeNull()
    expect(screen.getByText('Adicionar etiqueta')).toBeTruthy()
  })

  test('readOnly hides the preference trigger', () => {
    render(<PropertyCollection items={items} readOnly />)

    expect(screen.queryByRole('button', { name: 'Ajustar propriedades' })).toBeNull()
  })

  test('the trigger menu lists the whole catalog with the visible ones checked', () => {
    render(<PropertyCollection items={items} />)

    fireEvent.click(screen.getByRole('button', { name: 'Ajustar propriedades' }))

    const options = screen.getAllByRole('menuitemcheckbox')
    expect(options.map((option) => option.textContent)).toEqual([
      'Status',
      'Responsável',
      'Etiquetas',
    ])
    expect(options.map((option) => option.getAttribute('aria-checked'))).toEqual([
      'true',
      'true',
      'false',
    ])
  })

  test('toggling reveals the property and reports ids in catalog order', () => {
    const changes: (readonly string[])[] = []
    render(<PropertyCollection items={items} onVisibleChange={(next) => changes.push(next)} />)

    fireEvent.click(screen.getByRole('button', { name: 'Ajustar propriedades' }))
    fireEvent.click(screen.getByRole('menuitemcheckbox', { name: 'Etiquetas' }))

    expect(changes).toEqual([['status', 'assignee', 'tags']])
    expect(screen.getByText('Adicionar etiqueta')).toBeTruthy()

    fireEvent.click(screen.getByRole('menuitemcheckbox', { name: 'Status' }))
    expect(changes.at(-1)).toEqual(['assignee', 'tags'])
    expect(screen.queryByText('Em progresso')).toBeNull()
  })

  test('an item without render only exists in the menu', () => {
    const withSection = [...items, { id: 'checklist', label: 'Checklist' }] as const
    render(<PropertyCollection defaultVisible={['checklist']} items={withSection} />)

    const group = screen.getByRole('group')
    expect(group.textContent).toBe('')

    fireEvent.click(screen.getByRole('button', { name: 'Ajustar propriedades' }))
    const checklist = screen.getByRole('menuitemcheckbox', { name: 'Checklist' })
    expect(checklist.getAttribute('aria-checked')).toBe('true')
  })

  test('controlled visibility ignores internal state', () => {
    render(<PropertyCollection items={items} visible={['tags']} />)

    expect(screen.getByText('Adicionar etiqueta')).toBeTruthy()
    expect(screen.queryByText('Em progresso')).toBeNull()

    fireEvent.click(screen.getByRole('button', { name: 'Ajustar propriedades' }))
    fireEvent.click(screen.getByRole('menuitemcheckbox', { name: 'Status' }))

    expect(screen.queryByText('Em progresso')).toBeNull()
  })
})
