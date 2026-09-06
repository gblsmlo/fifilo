import { errorCodeToSurfaceKind } from '@fifilo/patterns/state-kinds'
import { StateSurface } from '@fifilo/patterns/state-surface'
import { Card, CardContent, CardHeader, CardTitle } from '@fifilo/ui/components/card'
import { formatMoney } from '@libs/format-money'
import { useQuery } from '@tanstack/react-query'
import { queryErrorMessage } from '../guard-state'
import { AnalyticsRequestError } from '../http/errors'
import { topExpensesQueryOptions } from '../query-options'

/**
 * A plain, already-accessible table - Fase 05 § Web's chart requirements
 * (legend, axis, second channel) do not apply to "the N largest rows,"
 * which a ranked table already presents as well as a chart would (Decision
 * 027's own note on why this projection has no chart type of its own).
 */
export function TopExpensesSection({ from, to }: Readonly<{ from: string; to: string }>) {
  const query = useQuery(topExpensesQueryOptions({ from, limit: 10, to }))

  return (
    <Card>
      <CardHeader>
        <CardTitle>Maiores gastos</CardTitle>
      </CardHeader>
      <CardContent>
        {query.isPending ? (
          <div aria-live='polite' className='h-40 animate-pulse rounded bg-muted' role='status' />
        ) : null}

        {query.isError ? (
          <StateSurface
            description={queryErrorMessage(
              query.error,
              'Não foi possível carregar os maiores gastos.',
            )}
            kind={errorCodeToSurfaceKind(
              query.error instanceof AnalyticsRequestError ? query.error.code : undefined,
            )}
            title='Maiores gastos'
          />
        ) : null}

        {!query.isPending && !query.isError && query.data.length === 0 ? (
          <StateSurface
            description='Sem despesas registradas no período selecionado.'
            kind='empty'
            title='Nenhuma despesa no período'
          />
        ) : null}

        {!query.isPending && !query.isError && query.data.length > 0 ? (
          <table className='w-full text-sm'>
            <caption className='sr-only'>Maiores gastos do período</caption>
            <thead>
              <tr className='text-left text-muted-foreground'>
                <th scope='col'>Descrição</th>
                <th scope='col'>Categoria</th>
                <th scope='col'>Data</th>
                <th scope='col'>Valor</th>
              </tr>
            </thead>
            <tbody>
              {query.data.map((row) => (
                <tr className='border-t' key={row.transactionId}>
                  <td className='py-2'>{row.description}</td>
                  <td>{row.categoryName ?? '—'}</td>
                  <td>{row.occurredOn}</td>
                  <td>{formatMoney({ amountMinor: row.amountMinor, currency: 'BRL' })}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : null}
      </CardContent>
    </Card>
  )
}
