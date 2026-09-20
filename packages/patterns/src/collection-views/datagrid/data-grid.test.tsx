import { afterEach, describe, expect, test } from 'bun:test'
import type { ComponentType, ReactElement } from 'react'

await import('../../test/dom')

// TanStack's virtualizer reads `ResizeObserver` at module import.
class MockResizeObserver {
  disconnect() {}
  observe() {}
  unobserve() {}
}

Object.assign(globalThis, { ResizeObserver: MockResizeObserver })

const { cleanup, fireEvent, render, screen } = await import('@testing-library/react')
const { DataGrid } = await import('./data-grid')
const { useDataGrid } = await import('./use-data-grid')
const { createSelectColumn } = await import('./data-grid-columns')

interface Campaign {
  id: string
  responsible: string
  title: string
}

const campaigns: Campaign[] = [
  { id: 'a', responsible: 'Ana', title: 'Retomada de inativos' },
  { id: 'c', responsible: 'Ana', title: 'Indicação premiada' },
  { id: 'b', responsible: 'Bruno', title: 'Aniversariantes' },
]

const columns = [
  { accessorKey: 'title', header: 'Campanha', meta: { label: 'Campanha' } },
  { accessorKey: 'responsible', header: 'Responsável', meta: { label: 'Responsável' } },
]

type GridProps = Omit<Parameters<typeof DataGrid<Campaign>>[0], 'table'>

function Grid(props: Readonly<GridProps>): ReactElement {
  const { table } = useDataGrid<Campaign>({
    columns,
    data: campaigns,
    getRowId: (campaign) => campaign.id,
  })

  return <DataGrid aria-label='Campanhas' table={table} {...props} />
}

const TypedGrid = Grid as ComponentType<GridProps>

afterEach(cleanup)

describe('DataGrid', () => {
  test('exposes the collection as an ARIA grid with one column header per column', () => {
    render(<TypedGrid />)

    const grid = screen.getByRole('grid', { name: 'Campanhas' })
    expect(grid).toBeTruthy()

    const headers = screen.getAllByRole('columnheader')
    expect(headers.map((header) => header.textContent?.trim())).toEqual(['Campanha', 'Responsável'])
  })

  test('renders one row per item, numbering rows after the header row', () => {
    render(<TypedGrid />)

    const rows = screen.getAllByRole('row')
    // 1 header + 3 data rows
    expect(rows).toHaveLength(4)
    expect(rows[1]?.getAttribute('aria-rowindex')).toBe('2')
    expect(screen.getByText('Retomada de inativos')).toBeTruthy()
  })

  test('marks the row reported by getRowSelected as selected', () => {
    render(<TypedGrid getRowSelected={(campaign) => campaign.id === 'b'} />)

    const selected = screen
      .getAllByRole('row')
      .filter((row) => row.getAttribute('aria-selected') === 'true')

    expect(selected).toHaveLength(1)
    expect(selected[0]?.textContent).toContain('Aniversariantes')
  })

  test('shows the empty message instead of rows when there is nothing to list', () => {
    function EmptyGrid(): ReactElement {
      const { table } = useDataGrid<Campaign>({ columns, data: [], getRowId: (c) => c.id })

      return <DataGrid emptyMessage='Nenhuma campanha para exibir.' table={table} />
    }

    render(<EmptyGrid />)

    expect(screen.getByText('Nenhuma campanha para exibir.')).toBeTruthy()
    expect(screen.queryByText('Retomada de inativos')).toBeNull()
  })

  test('replaces rows with the requested number of skeleton rows while loading', () => {
    render(<TypedGrid isLoading loadingRowCount={2} />)

    expect(screen.queryByText('Retomada de inativos')).toBeNull()
    // 1 header + 2 skeletons
    expect(screen.getAllByRole('row')).toHaveLength(3)
  })

  test('inserts one group row per run of rows sharing a getRowGroup value', () => {
    const { container } = render(<TypedGrid getRowGroup={(campaign) => campaign.responsible} />)

    const groupRows = container.querySelectorAll('[data-slot="data-grid-group-row"]')
    expect(Array.from(groupRows, (row) => row.textContent)).toEqual(['Ana', 'Bruno'])
  })

  /** The collection arrives ordered by group; without that the same group reopens
   *  and the sibling keys would collide. */
  test('reopens a group when the same value returns after another group', () => {
    function UnsortedGrid(): ReactElement {
      const { table } = useDataGrid<Campaign>({
        columns,
        data: [campaigns[0] as Campaign, campaigns[2] as Campaign, campaigns[1] as Campaign],
        getRowId: (campaign) => campaign.id,
      })

      return <DataGrid getRowGroup={(campaign) => campaign.responsible} table={table} />
    }

    const { container } = render(<UnsortedGrid />)

    const groupRows = container.querySelectorAll('[data-slot="data-grid-group-row"]')
    expect(Array.from(groupRows, (row) => row.textContent)).toEqual(['Ana', 'Bruno', 'Ana'])
  })

  test('keeps the selection column out of the visible column headers', () => {
    function SelectableGrid(): ReactElement {
      const { table } = useDataGrid<Campaign>({
        columns: [createSelectColumn<Campaign>(), ...columns],
        data: campaigns,
        enableRowSelection: true,
        getRowId: (campaign) => campaign.id,
      })

      return <DataGrid aria-label='Campanhas' table={table} />
    }

    render(<SelectableGrid />)

    const checkboxes = screen.getAllByRole('checkbox')
    // 1 in the header + 1 per row
    expect(checkboxes).toHaveLength(4)
  })
})

describe('DataGridCell', () => {
  test('renders a date-only value on its own calendar day, not shifted by the time zone', () => {
    function DateGrid(): ReactElement {
      const { table } = useDataGrid<{ id: string; updatedAt: string }>({
        columns: [
          {
            accessorKey: 'updatedAt',
            header: 'Atualizado em',
            meta: { label: 'Atualizado em', variant: 'date' },
          },
        ],
        data: [{ id: 'a', updatedAt: '2026-08-04' }],
        getRowId: (record) => record.id,
      })

      return <DataGrid table={table} />
    }

    render(<DateGrid />)

    // Comparing against the local date avoids pinning a locale format; what the
    // test protects is the calendar day, not the mask.
    const localDay = new Date('2026-08-04T00:00:00')
    expect(screen.getByText(localDay.toLocaleDateString())).toBeTruthy()
    expect(localDay.getDate()).toBe(4)
  })
})

describe('DataGrid pagination', () => {
  const paginationOf = (container: HTMLElement) =>
    container.querySelector('[data-slot="data-grid-pagination"]')

  function PaginatedGrid(props: Readonly<{ pagination?: boolean }>): ReactElement {
    const { table } = useDataGrid<Campaign>({
      columns,
      data: campaigns,
      enablePagination: true,
      getRowId: (campaign) => campaign.id,
      pageSize: 2,
    })

    return <DataGrid table={table} {...props} />
  }

  test('shows the pagination whenever the table paginates, without wiring the footer', () => {
    const { container } = render(<PaginatedGrid />)

    expect(paginationOf(container)).toBeTruthy()
  })

  test('leaves the footer empty when the table does not paginate', () => {
    const { container } = render(<TypedGrid />)

    expect(paginationOf(container)).toBeNull()
  })

  /** The whole collection in one scroll area, even with the pagination model on. */
  test('drops the pagination when the consumer asks for scroll only', () => {
    const { container } = render(<PaginatedGrid pagination={false} />)

    expect(paginationOf(container)).toBeNull()
  })

  test('lets an explicit footer take the slot instead of the pagination', () => {
    function CustomFooterGrid(): ReactElement {
      const { table } = useDataGrid<Campaign>({
        columns,
        data: campaigns,
        enablePagination: true,
        getRowId: (campaign) => campaign.id,
      })

      return <DataGrid footer={<span>3 campanhas</span>} table={table} />
    }

    const { container } = render(<CustomFooterGrid />)

    expect(paginationOf(container)).toBeNull()
    expect(screen.getByText('3 campanhas')).toBeTruthy()
  })
})

describe('DataGrid editable cells', () => {
  interface Task {
    id: string
    stage: string
  }

  const stageOptions = [
    { label: 'Aberto', value: 'aberto' },
    { label: 'Concluído', value: 'concluido' },
  ]

  function EditableGrid(props: Readonly<{ onChange?: (value: string) => void }>): ReactElement {
    const { table } = useDataGrid<Task>({
      columns: [
        {
          accessorKey: 'stage',
          header: 'Etapa',
          meta: {
            editable: true,
            label: 'Etapa',
            options: stageOptions,
            variant: 'select',
          },
        },
      ],
      data: [{ id: 'a', stage: 'aberto' }],
      getRowId: (task) => task.id,
      onCellValueChange: ({ value }) => props.onChange?.(value),
    })

    return <DataGrid table={table} />
  }

  test('renders the closed value as an accessible trigger, not as plain text', () => {
    const { container } = render(<EditableGrid />)

    const trigger = container.querySelector('[data-grid-select-trigger]')
    expect(trigger?.getAttribute('aria-label')).toBe('Etapa: Aberto')
    expect(trigger?.getAttribute('aria-haspopup')).toBe('listbox')
  })

  /**
   * The cell steals focus for itself when it becomes the current cell, and that
   * closed the popup the same click had just opened: an inner control is already
   * the right focus.
   */
  test('does not steal focus from a control inside the focused cell', async () => {
    const { container } = render(<EditableGrid />)

    const trigger = container.querySelector<HTMLElement>('[data-grid-select-trigger]')
    const cell = trigger?.closest<HTMLElement>('[data-slot="data-grid-cell"]')
    if (!(trigger && cell)) throw new Error('editable cell not rendered')

    fireEvent.click(cell)
    trigger.focus()
    fireEvent.click(cell)

    // O roubo de foco acontecia numa microtask do `ref`; assertar antes dela
    // esvaziar faria o teste passar mesmo com o defeito de volta.
    await Promise.resolve()
    await Promise.resolve()

    expect(document.activeElement).toBe(trigger)
  })
})

describe('DataGrid fill column', () => {
  const growOf = (container: HTMLElement, columnId: string) => {
    const cell = container.querySelector<HTMLElement>(
      `[data-slot="data-grid-header-cell"][data-column-id="${columnId}"]`,
    )
    return cell?.style.flexGrow
  }

  function FillGrid(props: Readonly<{ fillColumn?: string | false }>): ReactElement {
    const { table } = useDataGrid<Campaign>({
      columns,
      data: campaigns,
      getRowId: (campaign) => campaign.id,
    })

    return <DataGrid table={table} {...props} />
  }

  test('lets the last column absorb the leftover width by default', () => {
    const { container } = render(<FillGrid />)

    expect(growOf(container, 'title')).toBe('0')
    expect(growOf(container, 'responsible')).toBe('1')
  })

  test('keeps every column at its declared width when the fill is turned off', () => {
    const { container } = render(<FillGrid fillColumn={false} />)

    expect(growOf(container, 'title')).toBe('0')
    expect(growOf(container, 'responsible')).toBe('0')
  })

  /** Sem coluna que cresce, esticar deixaria uma faixa sem borda lendo como coluna fantasma. */
  test('shrinks the frame to the columns when no column fills, and stretches when one does', () => {
    const withoutFill = render(<FillGrid fillColumn={false} />)
    const shrunk = withoutFill.container.querySelector('[data-slot="data-grid"]')?.className ?? ''

    expect(shrunk).toContain('w-fit')
    expect(shrunk).toContain('max-w-full')
    expect(shrunk).not.toContain('w-full ')

    cleanup()

    const withFill = render(<FillGrid />)
    const stretched = withFill.container.querySelector('[data-slot="data-grid"]')?.className ?? ''

    expect(stretched).toContain('w-full')
    expect(stretched).not.toContain('w-fit')
  })

  test('moves the leftover width to the named column', () => {
    const { container } = render(<FillGrid fillColumn='title' />)

    expect(growOf(container, 'title')).toBe('1')
    expect(growOf(container, 'responsible')).toBe('0')
  })
})
