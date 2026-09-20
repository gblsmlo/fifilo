import { Stat, StatGroup } from '@fifilo/patterns/stat'
import { StateSurface } from '@fifilo/patterns/state-surface'
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
    <StatGroup columns={3}>
      <Stat
        label='Disponível em caixa'
        loading={query.isPending}
        value={result ? money(result.availableCashMinor) : undefined}
      />
      <Stat
        label='Comprometido em fatura'
        loading={query.isPending}
        value={result ? money(result.committedInvoiceMinor) : undefined}
      />
      <Stat
        label='Líquido'
        loading={query.isPending}
        tone={result && result.netMinor < 0 ? 'negative' : 'default'}
        value={result ? money(result.netMinor) : undefined}
      />
    </StatGroup>
  )
}
