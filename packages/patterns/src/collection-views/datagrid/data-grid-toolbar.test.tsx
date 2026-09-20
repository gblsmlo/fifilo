import { afterEach, describe, expect, test } from 'bun:test'
import type { ReactElement } from 'react'

await import('../../test/dom')

class MockResizeObserver {
  disconnect() {}
  observe() {}
  unobserve() {}
}

Object.assign(globalThis, { ResizeObserver: MockResizeObserver })

const { act, cleanup, fireEvent, render, screen } = await import('@testing-library/react')
const { DataGridSearch, DataGridSelectionSummary } = await import('./data-grid-toolbar')
const { CollectionToolbar } = await import('../collection/components/collection-toolbar')
const { useDataGrid } = await import('./use-data-grid')
const { createSelectColumn } = await import('./data-grid-columns')

interface Record {
  id: string
  owner: string
  title: string
}

const records: Record[] = [
  { id: 'a', owner: 'Ana', title: 'Retomada de inativos' },
  { id: 'b', owner: 'Bruno', title: 'Aniversariantes' },
]

const columns = [
  { accessorKey: 'title', header: 'Item', meta: { label: 'Item' } },
  { accessorKey: 'owner', header: 'Responsável', meta: { label: 'Responsável' } },
]

afterEach(cleanup)

describe('DataGridSearch', () => {
  test('drives the global filter and returns to the first page on every keystroke', () => {
    const seen = { pageIndex: -1, rows: [] as string[] }

    function SearchExample(): ReactElement {
      const { table } = useDataGrid<Record>({
        columns,
        data: records,
        enablePagination: true,
        getRowId: (record) => record.id,
        pageSize: 1,
      })
      seen.pageIndex = table.getState().pagination.pageIndex
      seen.rows = table.getRowModel().rows.map((row) => row.id)

      return (
        <CollectionToolbar>
          <DataGridSearch placeholder='Buscar…' table={table} />
        </CollectionToolbar>
      )
    }

    render(<SearchExample />)

    const field = screen.getByRole('searchbox', { name: 'Buscar…' })
    fireEvent.change(field, { target: { value: 'Aniversariantes' } })

    expect(seen.rows).toEqual(['b'])
    expect(seen.pageIndex).toBe(0)
  })
})

describe('DataGridSelectionSummary', () => {
  test('counts the selected rows, agreeing the label with the count', () => {
    const captured = { table: null as ReturnType<typeof useDataGrid<Record>>['table'] | null }

    function SelectionExample(): ReactElement {
      const { table } = useDataGrid<Record>({
        columns: [createSelectColumn<Record>(), ...columns],
        data: records,
        enableRowSelection: true,
        getRowId: (record) => record.id,
      })
      captured.table = table

      return (
        <CollectionToolbar>
          <DataGridSelectionSummary table={table} />
        </CollectionToolbar>
      )
    }

    const { container } = render(<SelectionExample />)
    const summary = () =>
      container.querySelector('[data-slot="data-grid-selection-summary"]')?.textContent?.trim()

    expect(summary()).toBe('0 selecionados')

    act(() => {
      captured.table?.getRow('a').toggleSelected(true)
    })
    expect(summary()).toBe('1 selecionado')

    act(() => {
      captured.table?.toggleAllRowsSelected(true)
    })
    expect(summary()).toBe('2 selecionados')
  })
})
