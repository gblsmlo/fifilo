import { TrendLineChart } from '@fifilo/patterns/charts/trend-line-chart'
import { Card, CardContent, CardHeader, CardTitle } from '@fifilo/ui/components/card'
import { formatMoney } from '@libs/format-money'
import { useQuery } from '@tanstack/react-query'

import { queryErrorMessage, queryGuardState } from '../guard-state'
import { balanceEvolutionQueryOptions } from '../query-options'

export function BalanceEvolutionSection({ from, to }: Readonly<{ from: string; to: string }>) {
  const query = useQuery(balanceEvolutionQueryOptions({ from, to }))
  const points = query.data?.consolidated ?? []

  return (
    <Card>
      <CardHeader>
        <CardTitle>Evolução de saldo</CardTitle>
      </CardHeader>
      <CardContent>
        <TrendLineChart
          data={points.map((point) => ({ balanceMinor: point.balanceMinor, x: point.date }))}
          series={[{ key: 'balanceMinor', label: 'Saldo consolidado' }]}
          state={queryGuardState(query, points.length === 0)}
          surface={{
            description: query.isError
              ? queryErrorMessage(query.error, 'Não foi possível carregar a evolução de saldo.')
              : 'Sem movimentação no período selecionado.',
            title: 'Evolução de saldo',
          }}
          valueFormatter={(value) => formatMoney({ amountMinor: value, currency: 'BRL' })}
          xAxisLabel='Data'
        />
      </CardContent>
    </Card>
  )
}
