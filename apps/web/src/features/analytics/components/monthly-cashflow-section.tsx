import { TrendLineChart } from '@fifilo/patterns/charts/trend-line-chart'
import { Widget, WidgetPanel } from '@fifilo/patterns/widget'
import { formatMoney } from '@libs/format-money'
import { useQuery } from '@tanstack/react-query'

import { queryErrorMessage, queryGuardState } from '../guard-state'
import { monthlyCashflowQueryOptions } from '../query-options'

export function MonthlyCashflowSection({ from, to }: Readonly<{ from: string; to: string }>) {
  const query = useQuery(monthlyCashflowQueryOptions({ from, to }))
  const points = query.data ?? []

  return (
    <Widget description='Receita e despesa por mês do período.' title='Fluxo mensal'>
      <WidgetPanel>
        <TrendLineChart
          data={points.map((point) => ({
            expenseMinor: point.expenseMinor,
            incomeMinor: point.incomeMinor,
            x: point.month,
          }))}
          series={[
            { key: 'incomeMinor', label: 'Receita' },
            { key: 'expenseMinor', label: 'Despesa' },
          ]}
          state={queryGuardState(query, points.length === 0)}
          surface={{
            description: query.isError
              ? queryErrorMessage(query.error, 'Não foi possível carregar o fluxo mensal.')
              : 'Sem movimentação no período selecionado.',
            title: 'Fluxo mensal',
          }}
          valueFormatter={(value) => formatMoney({ amountMinor: value, currency: 'BRL' })}
          xAxisLabel='Mês'
        />
      </WidgetPanel>
    </Widget>
  )
}
