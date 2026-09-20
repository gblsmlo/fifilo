import { RankedBarChart } from '@fifilo/patterns/charts/ranked-bar-chart'
import { Widget, WidgetPanel } from '@fifilo/patterns/widget'
import { formatMoney } from '@libs/format-money'
import { useQuery } from '@tanstack/react-query'

import { queryErrorMessage, queryGuardState } from '../guard-state'
import { spendByCategoryQueryOptions } from '../query-options'

export function SpendByCategorySection({ from, to }: Readonly<{ from: string; to: string }>) {
  const query = useQuery(spendByCategoryQueryOptions({ from, kind: 'expense', to }))
  const rows = query.data ?? []

  return (
    <Widget description='Despesa acumulada por categoria no período.' title='Gasto por categoria'>
      <WidgetPanel>
        <RankedBarChart
          data={rows.map((row) => ({
            id: row.categoryId,
            label: row.categoryName,
            value: row.totalMinor,
          }))}
          state={queryGuardState(query, rows.length === 0)}
          surface={{
            description: query.isError
              ? queryErrorMessage(query.error, 'Não foi possível carregar o gasto por categoria.')
              : 'Sem gasto no período selecionado.',
            title: 'Gasto por categoria',
          }}
          valueFormatter={(value) => formatMoney({ amountMinor: value, currency: 'BRL' })}
          valueLabel='Total gasto'
        />
      </WidgetPanel>
    </Widget>
  )
}
