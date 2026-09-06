import { RankedBarChart } from '@fifilo/patterns/charts/ranked-bar-chart'
import { Card, CardContent, CardHeader, CardTitle } from '@fifilo/ui/components/card'
import { formatMoney } from '@libs/format-money'
import { useQuery } from '@tanstack/react-query'

import { queryErrorMessage, queryGuardState } from '../guard-state'
import { spendByAccountQueryOptions } from '../query-options'

export function SpendByAccountSection({ from, to }: Readonly<{ from: string; to: string }>) {
  const query = useQuery(spendByAccountQueryOptions({ from, to }))
  const rows = query.data ?? []

  return (
    <Card>
      <CardHeader>
        <CardTitle>Gasto por conta</CardTitle>
      </CardHeader>
      <CardContent>
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
      </CardContent>
    </Card>
  )
}
