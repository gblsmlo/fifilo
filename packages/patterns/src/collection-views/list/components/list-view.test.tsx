import { afterEach, describe, expect, test } from 'bun:test'

await import('../../../test/dom')

const { cleanup, fireEvent, render, screen } = await import('@testing-library/react')
const { ListView } = await import('./list-view')

afterEach(cleanup)

type TestItem = {
  id: string
  statusId: string
  title: string
}

const twoStatusGroupings = [
  {
    getGroupId: (item: TestItem) => item.statusId,
    id: 'status',
    label: 'Status',
    options: [
      { id: 'todo', label: 'Todo' },
      { id: 'done', label: 'Done' },
    ],
  },
]

function collectionOf(items: readonly TestItem[]) {
  return {
    getKey: (item: TestItem) => item.id,
    getLabel: (item: TestItem) => item.title,
    groupings: twoStatusGroupings,
    items: [...items],
  }
}

const isGroupOpen = (container: HTMLElement, groupLabel: string) =>
  Boolean(
    container
      .querySelector(`[aria-label="Collapse ${groupLabel}"]`)
      ?.closest('[data-slot="list-group"]'),
  )

// The circular count badge and the growth of the row body are asserted in the
// `Patterns/Collections/Views/List › GroupedByStatus` story, in rendered geometry.
describe('ListView', () => {
  test('renders one collection skeleton per known group while loading', () => {
    const { container } = render(
      <ListView<TestItem>
        collection={{
          getKey: (item) => item.id,
          getLabel: (item) => item.title,
          groupings: [
            {
              getGroupId: (item) => item.statusId,
              id: 'status',
              label: 'Status',
              options: [
                { id: 'todo', label: 'Todo' },
                { id: 'done', label: 'Done' },
              ],
            },
          ],
          items: [],
        }}
        grouping='status'
        loading
        loadingItemLabel='Carregando item da coleção'
        renderItem={(item) => <span>{item.title}</span>}
      />,
    )

    expect(container.querySelector('[data-slot="list-view"]')?.getAttribute('aria-busy')).toBe(
      'true',
    )
    expect(screen.getAllByRole('status', { name: 'Carregando item da coleção' })).toHaveLength(2)
    expect(container.querySelectorAll('[data-slot="list-group"]')).toHaveLength(2)
    expect(screen.queryByText('No items in this group.')).toBeNull()
  })

  test('renders canonical group metadata and a circular count badge', () => {
    const { container } = render(
      <ListView<TestItem>
        collection={{
          getKey: (item) => item.id,
          getLabel: (item) => item.title,
          groupings: [
            {
              getGroupId: (item) => item.statusId,
              id: 'status',
              label: 'Status',
              options: [{ id: 'todo', label: 'Todo' }],
            },
          ],
          items: [{ id: 'item-1', statusId: 'todo', title: 'First item' }],
        }}
        grouping='status'
        renderGroupTitle={(group) => <span data-status-property='true'>{group.label}</span>}
        renderItem={(item) => <span>{item.title}</span>}
      />,
    )

    expect(screen.getByRole('heading', { name: 'Todo' })).toBeTruthy()
    expect(container.querySelector('[data-status-property="true"]')).toBeTruthy()

    const count = container.querySelector('[data-slot="list-group-count"]')
    expect(count?.textContent).toBe('1')
  })
})

describe('ListView without grouping', () => {
  test('reads the collection as a flat list, in the order the consumer passed', () => {
    const { container } = render(
      <ListView<TestItem>
        collection={collectionOf([
          { id: 'item-1', statusId: 'done', title: 'First item' },
          { id: 'item-2', statusId: 'todo', title: 'Second item' },
        ])}
        grouping={null}
        renderItem={(item) => <span>{item.title}</span>}
      />,
    )

    const view = container.querySelector('[data-slot="list-view"]')
    expect(view?.hasAttribute('data-collection-grouping')).toBe(false)
    expect(container.querySelectorAll('[data-slot="list-group"]')).toHaveLength(0)

    // The order is the collection's, not that of the declared dimensions.
    const titles = Array.from(
      container.querySelectorAll('[data-slot="list-view-items"] > span'),
      (item) => item.textContent,
    )
    expect(titles).toEqual(['First item', 'Second item'])
  })

  test('renders the requested skeleton count while loading', () => {
    const { container } = render(
      <ListView<TestItem>
        collection={collectionOf([])}
        grouping={null}
        loading
        loadingItemCount={3}
        loadingItemLabel='Carregando item da coleção'
        renderItem={(item) => <span>{item.title}</span>}
      />,
    )

    expect(container.querySelector('[data-slot="list-view"]')?.getAttribute('aria-busy')).toBe(
      'true',
    )
    expect(screen.getAllByRole('status', { name: 'Carregando item da coleção' })).toHaveLength(3)
  })
})

describe('ListView collapseEmptyGroups', () => {
  test('starts an empty group collapsed and keeps a populated one open', () => {
    const { container } = render(
      <ListView<TestItem>
        collapseEmptyGroups
        collection={collectionOf([{ id: 'item-1', statusId: 'todo', title: 'First item' }])}
        grouping='status'
        renderItem={(item) => <span>{item.title}</span>}
      />,
    )

    expect(isGroupOpen(container, 'Todo')).toBe(true)
    expect(isGroupOpen(container, 'Done')).toBe(false)
  })

  test('keeps every group open while loading, even with no items yet', () => {
    const { container } = render(
      <ListView<TestItem>
        collapseEmptyGroups
        collection={collectionOf([])}
        grouping='status'
        loading
        renderItem={(item) => <span>{item.title}</span>}
      />,
    )

    expect(isGroupOpen(container, 'Todo')).toBe(true)
    expect(isGroupOpen(container, 'Done')).toBe(true)
  })

  test('honours the manual choice over the emptiness of the group', () => {
    const { container } = render(
      <ListView<TestItem>
        collapseEmptyGroups
        collection={collectionOf([{ id: 'item-1', statusId: 'todo', title: 'First item' }])}
        grouping='status'
        renderItem={(item) => <span>{item.title}</span>}
      />,
    )

    // Opening an empty group sticks: the manual choice beats the automatic one.
    fireEvent.click(screen.getByRole('button', { name: 'Expand Done' }))
    expect(isGroupOpen(container, 'Done')).toBe(true)

    // Closing a populated group sticks as well.
    fireEvent.click(screen.getByRole('button', { name: 'Collapse Todo' }))
    expect(isGroupOpen(container, 'Todo')).toBe(false)
  })

  test('reopens an untouched group as soon as it receives items', () => {
    const { container, rerender } = render(
      <ListView<TestItem>
        collapseEmptyGroups
        collection={collectionOf([])}
        grouping='status'
        renderItem={(item) => <span>{item.title}</span>}
      />,
    )

    expect(isGroupOpen(container, 'Done')).toBe(false)

    rerender(
      <ListView<TestItem>
        collapseEmptyGroups
        collection={collectionOf([{ id: 'item-1', statusId: 'done', title: 'First item' }])}
        grouping='status'
        renderItem={(item) => <span>{item.title}</span>}
      />,
    )

    expect(isGroupOpen(container, 'Done')).toBe(true)
  })

  test('reports the effective collapsed ids to the consumer', () => {
    const changes: readonly string[][] = []
    render(
      <ListView<TestItem>
        collapseEmptyGroups
        collection={collectionOf([{ id: 'item-1', statusId: 'todo', title: 'First item' }])}
        grouping='status'
        onCollapsedGroupIdsChange={(groupIds) => {
          ;(changes as string[][]).push([...groupIds])
        }}
        renderItem={(item) => <span>{item.title}</span>}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Collapse Todo' }))

    // O grupo vazio entra na lista junto do que a pessoa acabou de fechar.
    expect(changes.at(-1)).toEqual(['status:todo', 'status:done'])
  })
})
