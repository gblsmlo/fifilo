import { RankedBarChart } from '@fifilo/patterns/charts/ranked-bar-chart'
import { Widget, WidgetPanel } from '@fifilo/patterns/widget'
import { formatMoney } from '@libs/format-money'
import { useQuery } from '@tanstack/react-query'

import { queryErrorMessage, queryGuardState } from '../guard-state'
import { spendByAccountQueryOptions } from '../query-options'

export function SpendByAccountSection({ from, to }: Readonly<{ from: string; to: string }>) {
  const query = useQuery(spendByAccountQueryOptions({ from, to }))
  const rows = query.data ?? []

  return (
    <Widget description='Despesa acumulada por conta no período.' title='Gasto por conta'>
      <WidgetPanel>
        <RankedBarChart
          data={rows.map((row) => ({
            id: row.accountId,
            label: row.accountName,
            value: row.totalMinor,
          }))}
          state={queryGuardState(query, rows.length === 0)}
          surface={{
            description: query.isError
              ? queryErrorMessage(query.error, 'Não foi possível carregar o gasto por conta.')
              : 'Sem gasto no período selecionado.',
            title: 'Gasto por conta',
          }}
          valueFormatter={(value) => formatMoney({ amountMinor: value, currency: 'BRL' })}
          valueLabel='Total gasto'
        />
      </WidgetPanel>
    </Widget>
  )
}
