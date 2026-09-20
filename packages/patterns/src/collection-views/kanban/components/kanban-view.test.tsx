import { afterEach, describe, expect, test } from 'bun:test'

await import('../../../test/dom')

class MockResizeObserver {
  disconnect() {}
  observe() {}
  unobserve() {}
}

Object.assign(globalThis, { ResizeObserver: MockResizeObserver })

const { cleanup, render, screen } = await import('@testing-library/react')
const { KanbanView } = await import('./kanban-view')

afterEach(cleanup)

describe('KanbanView', () => {
  test('renders one canonical card skeleton per known column while loading', () => {
    const { container } = render(
      <KanbanView
        columns={[
          { cards: [], count: 0, id: 'todo', title: 'Todo' },
          { cards: [], count: 0, id: 'done', title: 'Done' },
        ]}
        getKey={(card: { id: string }) => card.id}
        loading
        loadingCardLabel='Carregando item da coleção'
        renderCard={(card) => <span>{card.id}</span>}
      />,
    )

    expect(container.querySelector('[data-slot="kanban-view"]')?.getAttribute('aria-busy')).toBe(
      'true',
    )
    expect(screen.getAllByRole('status', { name: 'Carregando item da coleção' })).toHaveLength(3)
    expect(screen.queryByText('Nenhum item nesta coluna.')).toBeNull()
  })

  test('keeps the column label accessible while rendering canonical visual metadata', () => {
    render(
      <KanbanView
        columns={[{ cards: [{ id: 'task-1' }], count: 1, id: 'todo', title: 'Todo' }]}
        getKey={(card) => card.id}
        renderCard={(card) => <span>{card.id}</span>}
        renderColumnTitle={(column) => <span data-testid='column-title'>{column.id}</span>}
      />,
    )

    expect(screen.getAllByRole('heading', { name: 'todo' })).toHaveLength(2)
    expect(screen.getAllByTestId('column-title')).toHaveLength(2)
    expect(screen.getAllByText('task-1')).toHaveLength(2)
  })
})
