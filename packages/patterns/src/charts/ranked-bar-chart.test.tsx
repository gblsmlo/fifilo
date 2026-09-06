import { afterEach, describe, expect, test } from 'bun:test'

await import('../test/dom')

const { cleanup, render, screen } = await import('@testing-library/react')
const { RankedBarChart } = await import('./ranked-bar-chart')

afterEach(cleanup)

const surface = { description: 'Sem gasto no período.', title: 'Gasto por categoria' }

describe('RankedBarChart', () => {
  test('a non-data state renders the surface, not the chart or the table', () => {
    render(<RankedBarChart data={[]} state='empty' surface={surface} valueLabel='Total' />)

    expect(screen.getByText('Gasto por categoria')).toBeTruthy()
    expect(screen.queryByRole('table')).toBeNull()
  })

  test('the accessible table lists every row with its formatted value', () => {
    render(
      <RankedBarChart
        data={[
          { id: 'groceries', label: 'Mercado', value: 7_500 },
          { id: 'transport', label: 'Transporte', value: 2_500 },
        ]}
        state='data'
        surface={surface}
        valueFormatter={(value) => `R$ ${value}`}
        valueLabel='Total'
      />,
    )

    expect(screen.getByRole('row', { name: 'Mercado R$ 7500' })).toBeTruthy()
    expect(screen.getByRole('row', { name: 'Transporte R$ 2500' })).toBeTruthy()
  })
})
