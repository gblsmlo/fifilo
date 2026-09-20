import { afterEach, describe, expect, test } from 'bun:test'

await import('../test/dom')

const { cleanup, fireEvent, render, screen } = await import('@testing-library/react')
const { DataTable } = await import('./data-table')

afterEach(cleanup)

type Row = { id: string; name: string; total: number }

const rows: Row[] = [
  { id: 'a', name: 'Mercado', total: 300 },
  { id: 'b', name: 'Transporte', total: 120 },
]

const columns = [
  { cell: (row: Row) => row.name, header: 'Nome', id: 'name' },
  { align: 'end' as const, cell: (row: Row) => String(row.total), header: 'Total', id: 'total' },
]

describe('DataTable', () => {
  test('names the table by its caption and renders one row per key', () => {
    render(<DataTable caption='Gastos' columns={columns} rowKey={(row) => row.id} rows={rows} />)

    expect(screen.getByRole('table', { name: 'Gastos' })).toBeTruthy()
    expect(screen.getAllByRole('row')).toHaveLength(3)
    expect(screen.getByRole('columnheader', { name: 'Total' }).className).toContain('text-right')
    expect(screen.getByRole('cell', { name: '300' }).className).toContain('text-right')
  })

  test('the footer spans the first cell across the columns it does not name', () => {
    const { container } = render(
      <DataTable
        caption='Gastos'
        columns={[{ cell: () => '-', header: 'Extra', id: 'extra' }, ...columns]}
        footer={['Total', '420']}
        rowKey={(row) => row.id}
        rows={rows}
      />,
    )

    const cells = container.querySelectorAll('tfoot td')
    expect(cells).toHaveLength(2)
    expect(cells[0]?.getAttribute('colspan')).toBe('2')
    expect(cells[0]?.textContent).toBe('Total')
    expect(cells[1]?.className).toContain('text-right')
  })

  test('marks the selected row and selects by pointer and keyboard', () => {
    const selected: string[] = []
    render(
      <DataTable
        caption='Gastos'
        columns={columns}
        onRowSelect={(row) => selected.push(row.id)}
        rowKey={(row) => row.id}
        rows={rows}
        selectedRowKey='b'
      />,
    )

    const [, first, second] = screen.getAllByRole('row')
    expect(second?.dataset.state).toBe('selected')
    expect(first?.dataset.state).toBeUndefined()
    expect(first?.tabIndex).toBe(0)

    if (!first) throw new Error('missing row')
    fireEvent.click(first)
    fireEvent.keyDown(first, { key: 'Enter' })
    fireEvent.keyDown(first, { key: 'a' })

    expect(selected).toEqual(['a', 'a'])
  })

  test('without onRowSelect the rows are inert', () => {
    render(<DataTable caption='Gastos' columns={columns} rowKey={(row) => row.id} rows={rows} />)

    const [, first] = screen.getAllByRole('row')
    expect(first?.hasAttribute('tabindex')).toBe(false)
  })
})
