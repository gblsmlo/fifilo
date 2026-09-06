import { StateSurface } from '@fifilo/patterns/state-surface'
import { Card, CardContent, CardHeader, CardTitle } from '@fifilo/ui/components/card'
import { formatMoney } from '@libs/format-money'
import { useQuery } from '@tanstack/react-query'

import { queryErrorMessage } from '../guard-state'
import { consolidatedBalanceQueryOptions } from '../query-options'

const money = (amountMinor: number) => formatMoney({ amountMinor, currency: 'BRL' })

/**
 * Disponível em caixa e comprometido em fatura stay two separate stats, not
 * one blended number, so a card purchase never reads as if it reduced cash
 * (Fase 05 § Modelagem, the same distinction Fase 03 § Riscos protects).
 */
export function ConsolidatedBalanceSection({ asOf }: Readonly<{ asOf: string }>) {
  const query = useQuery(consolidatedBalanceQueryOptions(asOf))

  if (query.isPending) {
    return (
      <div className='grid gap-4 sm:grid-cols-3' role='status'>
        {['cash', 'invoice', 'net'].map((key) => (
          <Card key={key}>
            <CardHeader>
              <CardTitle className='h-4 animate-pulse rounded bg-muted' />
            </CardHeader>
          </Card>
        ))}
      </div>
    )
  }

  if (query.isError) {
    return (
      <StateSurface
        description={queryErrorMessage(
          query.error,
          'Não foi possível carregar o saldo consolidado.',
        )}
        kind='error'
        title='Saldo consolidado'
      />
    )
  }

  const result = query.data

  return (
    <div className='grid gap-4 sm:grid-cols-3'>
      <StatCard title='Disponível em caixa' value={money(result.availableCashMinor)} />
      <StatCard title='Comprometido em fatura' value={money(result.committedInvoiceMinor)} />
      <StatCard title='Líquido' value={money(result.netMinor)} />
    </div>
  )
}

function StatCard({ title, value }: Readonly<{ title: string; value: string }>) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className='text-muted-foreground text-sm'>{title}</CardTitle>
      </CardHeader>
      <CardContent className='font-semibold text-2xl'>{value}</CardContent>
    </Card>
  )
}
