import { errorCodeToSurfaceKind } from '@fifilo/patterns/state-kinds'
import { StateSurface } from '@fifilo/patterns/state-surface'
import { Card, CardContent, CardHeader, CardTitle } from '@fifilo/ui/components/card'
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@fifilo/ui/components/table'
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
          <Table>
            <TableCaption className='sr-only'>Maiores gastos do período</TableCaption>
            <TableHeader>
              <TableRow>
                <TableHead>Descrição</TableHead>
                <TableHead>Categoria</TableHead>
                <TableHead>Data</TableHead>
                <TableHead>Valor</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {query.data.map((row) => (
                <TableRow key={row.transactionId}>
                  <TableCell>{row.description}</TableCell>
                  <TableCell>{row.categoryName ?? '—'}</TableCell>
                  <TableCell>{row.occurredOn}</TableCell>
                  <TableCell>
                    {formatMoney({ amountMinor: row.amountMinor, currency: 'BRL' })}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : null}
      </CardContent>
    </Card>
  )
}
