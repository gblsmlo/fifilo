import { afterEach, describe, expect, test } from 'bun:test'
import type { ReactElement } from 'react'

await import('../../test/dom')

class MockResizeObserver {
  disconnect() {}
  observe() {}
  unobserve() {}
}

Object.assign(globalThis, { ResizeObserver: MockResizeObserver })

const { act, cleanup, render } = await import('@testing-library/react')
const { useDataGrid } = await import('./use-data-grid')

interface Campaign {
  id: string
  reach: number
  title: string
}

const campaigns: Campaign[] = [
  { id: 'a', reach: 30, title: 'Retomada de inativos' },
  { id: 'b', reach: 10, title: 'Aniversariantes' },
  { id: 'c', reach: 20, title: 'Indicação premiada' },
]

const columns = [
  { accessorKey: 'title', header: 'Campanha' },
  { accessorKey: 'reach', header: 'Alcance' },
]

type Options = Omit<Parameters<typeof useDataGrid<Campaign>>[0], 'columns' | 'data'>

/** Mounts the hook outside a dedicated test component so the instance can be acted on. */
function renderTable(options: Options = {}) {
  const captured = { table: null as ReturnType<typeof useDataGrid<Campaign>>['table'] | null }

  function Probe(): ReactElement {
    const { table } = useDataGrid<Campaign>({
      columns,
      data: campaigns,
      getRowId: (campaign) => campaign.id,
      ...options,
    })
    captured.table = table

    return <div />
  }

  render(<Probe />)

  return captured as { table: ReturnType<typeof useDataGrid<Campaign>>['table'] }
}

afterEach(cleanup)

describe('useDataGrid', () => {
  test('keeps the source order until a sort is applied', () => {
    const captured = renderTable()

    expect(captured.table.getRowModel().rows.map((row) => row.id)).toEqual(['a', 'b', 'c'])

    act(() => {
      captured.table.getColumn('reach')?.toggleSorting(false)
    })

    expect(captured.table.getRowModel().rows.map((row) => row.id)).toEqual(['b', 'c', 'a'])
  })

  test('does not sort when sorting is disabled', () => {
    const captured = renderTable({ enableSorting: false })

    act(() => {
      captured.table.getColumn('reach')?.toggleSorting(false)
    })

    expect(captured.table.getRowModel().rows.map((row) => row.id)).toEqual(['a', 'b', 'c'])
  })

  test('keys row selection by getRowId, not by position', () => {
    const captured = renderTable({ enableRowSelection: true })

    act(() => {
      captured.table.getRow('b').toggleSelected(true)
    })

    expect(captured.table.getState().rowSelection).toEqual({ b: true })
    expect(captured.table.getSelectedRowModel().rows.map((row) => row.original.title)).toEqual([
      'Aniversariantes',
    ])
  })

  test('paginates only when pagination is enabled', () => {
    const withoutPagination = renderTable()
    expect(withoutPagination.table.getRowModel().rows).toHaveLength(3)

    cleanup()

    const withPagination = renderTable({ enablePagination: true, pageSize: 2 })
    expect(withPagination.table.getRowModel().rows).toHaveLength(2)
    expect(withPagination.table.getPageCount()).toBe(2)

    act(() => {
      withPagination.table.nextPage()
    })

    expect(withPagination.table.getRowModel().rows.map((row) => row.id)).toEqual(['c'])
  })

  /** The offset feeds the rows' ARIA numbering, which has to be continuous across pages. */
  test('reports the row offset of the current page through the table metadata', () => {
    const captured = renderTable({ enablePagination: true, pageSize: 2 })

    expect(captured.table.options.meta?.dataGridPaginationRowOffset).toBe(0)

    act(() => {
      captured.table.nextPage()
    })

    expect(captured.table.options.meta?.dataGridPaginationRowOffset).toBe(2)
  })

  test('carries density in the table metadata and lets the toolbar change it', () => {
    const captured = renderTable()

    expect(captured.table.options.meta?.dataGridDensity).toBe('short')

    act(() => {
      captured.table.options.meta?.onDataGridDensityChange?.('tall')
    })

    expect(captured.table.options.meta?.dataGridDensity).toBe('tall')
  })

  test('filters rows through the global filter', () => {
    const captured = renderTable()

    act(() => {
      captured.table.setGlobalFilter('premiada')
    })

    expect(captured.table.getRowModel().rows.map((row) => row.id)).toEqual(['c'])
  })
})
