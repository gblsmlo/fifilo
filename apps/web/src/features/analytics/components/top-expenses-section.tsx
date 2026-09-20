import type { TopExpensesResponse } from '@fifilo/core/analytics'
import { DataTable, type DataTableColumn } from '@fifilo/patterns/data-table'
import { Widget } from '@fifilo/patterns/widget'
import { Text } from '@fifilo/ui/components/text'
import { formatMoney } from '@libs/format-money'
import { useQuery } from '@tanstack/react-query'
import { queryErrorMessage, queryGuardState } from '../guard-state'
import { topExpensesQueryOptions } from '../query-options'

type TopExpenseRow = TopExpensesResponse[number]

const columns: DataTableColumn<TopExpenseRow>[] = [
  {
    cell: (row) => (
      <Text render={<span />} size='sm' weight='medium'>
        {row.description}
      </Text>
    ),
    header: 'Descrição',
    id: 'description',
  },
  {
    cell: (row) => (
      <Text foreground='muted' render={<span />} size='sm'>
        {row.categoryName ?? '—'}
      </Text>
    ),
    header: 'Categoria',
    id: 'category',
  },
  {
    cell: (row) => (
      <Text className='tabular-nums' foreground='muted' render={<span />} size='sm'>
        {row.occurredOn}
      </Text>
    ),
    header: 'Data',
    id: 'date',
  },
  {
    align: 'end',
    cell: (row) => (
      <Text className='tabular-nums' render={<span />} size='sm' weight='semibold'>
        {formatMoney({ amountMinor: row.amountMinor, currency: 'BRL' })}
      </Text>
    ),
    header: 'Valor',
    id: 'amount',
  },
]

/**
 * A plain, already-accessible table - Fase 05 § Web's chart requirements
 * (legend, axis, second channel) do not apply to "the N largest rows,"
 * which a ranked table already presents as well as a chart would (Decision
 * 027's own note on why this projection has no chart type of its own).
 */
export function TopExpensesSection({ from, to }: Readonly<{ from: string; to: string }>) {
  const query = useQuery(topExpensesQueryOptions({ from, limit: 10, to }))
  const rows = query.data ?? []

  return (
    <Widget
      description='As dez maiores despesas do período.'
      state={queryGuardState(query, rows.length === 0)}
      surface={{
        description: query.isError
          ? queryErrorMessage(query.error, 'Não foi possível carregar os maiores gastos.')
          : 'Sem despesas registradas no período selecionado.',
        title: query.isError ? 'Maiores gastos' : 'Nenhuma despesa no período',
      }}
      title='Maiores gastos'
    >
      <DataTable
        caption='Maiores gastos do período'
        columns={columns}
        rowKey={(row) => row.transactionId}
        rows={rows}
      />
    </Widget>
  )
}
