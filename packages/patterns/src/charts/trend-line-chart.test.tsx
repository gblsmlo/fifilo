import { afterEach, describe, expect, test } from 'bun:test'

await import('../test/dom')

const { cleanup, render, screen } = await import('@testing-library/react')
const { TrendLineChart } = await import('./trend-line-chart')

afterEach(cleanup)

const surface = { description: 'Sem dados no período.', title: 'Fluxo mensal' }

describe('TrendLineChart', () => {
  test('a non-data state renders the surface, not the chart or the table', () => {
    render(
      <TrendLineChart
        data={[]}
        series={[{ key: 'income', label: 'Receita' }]}
        state='empty'
        surface={surface}
        xAxisLabel='Mês'
      />,
    )

    expect(screen.getByText('Fluxo mensal')).toBeTruthy()
    expect(screen.queryByRole('table')).toBeNull()
  })

  test('the accessible table carries the same rows and columns as the chart', () => {
    render(
      <TrendLineChart
        data={[
          { expenseMinor: 3_000, incomeMinor: 5_000, x: '2026-01' },
          { expenseMinor: 4_000, incomeMinor: 6_000, x: '2026-02' },
        ]}
        series={[
          { key: 'incomeMinor', label: 'Receita' },
          { key: 'expenseMinor', label: 'Despesa' },
        ]}
        state='data'
        surface={surface}
        valueFormatter={(value) => `R$ ${value}`}
        xAxisLabel='Mês'
      />,
    )

    const table = screen.getByText('Fluxo mensal').closest('table')
    expect(table).not.toBeNull()
    expect(screen.getByRole('columnheader', { name: 'Receita' })).toBeTruthy()
    expect(screen.getByRole('columnheader', { name: 'Despesa' })).toBeTruthy()
    expect(screen.getByRole('row', { name: /2026-01/ })).toBeTruthy()
    expect(screen.getAllByText('R$ 5000')).toHaveLength(1)
  })
})
