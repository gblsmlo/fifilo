import type { InvoiceResponse } from '@fifilo/core/credit-cards'
import { DataTable, type DataTableColumn } from '@fifilo/patterns/data-table'
import { errorCodeToSurfaceKind } from '@fifilo/patterns/state-kinds'
import type { SurfaceGuardState } from '@fifilo/patterns/state-surface'
import { Widget } from '@fifilo/patterns/widget'
import { Badge } from '@fifilo/ui/components/badge'
import { Text } from '@fifilo/ui/components/text'
import { formatMoney } from '@libs/format-money'

const STATUS_LABELS: Record<InvoiceResponse['status'], string> = {
  closed: 'Fechada',
  open: 'Aberta',
  overdue: 'Vencida',
  paid: 'Paga',
}

const STATUS_VARIANTS: Record<
  InvoiceResponse['status'],
  'default' | 'secondary' | 'success' | 'warning'
> = {
  closed: 'secondary',
  open: 'default',
  overdue: 'warning',
  paid: 'success',
}

export interface InvoiceListError {
  code?: string
  message: string
  onRetry?: () => void
}

interface InvoiceListProps {
  error?: InvoiceListError | null
  invoices: readonly InvoiceResponse[]
  isPending?: boolean
  onSelect: (invoiceId: string) => void
  selectedInvoiceId?: string | null
}

const resolveState = (
  error: InvoiceListError | null,
  isPending: boolean,
  isEmpty: boolean,
): SurfaceGuardState => {
  if (error) return errorCodeToSurfaceKind(error.code)
  if (isPending) return 'loading'
  if (isEmpty) return 'empty'
  return 'data'
}

const columns: DataTableColumn<InvoiceResponse>[] = [
  {
    cell: (invoice) => (
      <Text className='tabular-nums' render={<span />} size='sm' weight='medium'>
        {invoice.periodStart} — {invoice.periodEnd}
      </Text>
    ),
    header: 'Período',
    id: 'period',
  },
  {
    cell: (invoice) => (
      <Text className='tabular-nums' foreground='muted' render={<span />} size='sm'>
        {invoice.dueOn}
      </Text>
    ),
    header: 'Vencimento',
    id: 'due',
  },
  {
    cell: (invoice) => (
      <Badge variant={STATUS_VARIANTS[invoice.status]}>{STATUS_LABELS[invoice.status]}</Badge>
    ),
    header: 'Status',
    id: 'status',
  },
  {
    align: 'end',
    cell: (invoice) => (
      <Text className='tabular-nums' render={<span />} size='sm' weight='semibold'>
        {formatMoney({ amountMinor: invoice.totalMinor, currency: 'BRL' })}
      </Text>
    ),
    header: 'Total',
    id: 'total',
  },
]

export function InvoiceList({
  error = null,
  invoices,
  isPending = false,
  onSelect,
  selectedInvoiceId = null,
}: Readonly<InvoiceListProps>) {
  const state = resolveState(error, isPending, invoices.length === 0)
  const surface = error
    ? {
        actions: error.onRetry
          ? [{ label: 'Tentar novamente', onPress: error.onRetry }]
          : undefined,
        description: error.message,
        title: 'Não foi possível carregar as faturas',
      }
    : isPending
      ? { description: 'Buscando as faturas do cartão.', title: 'Carregando faturas' }
      : {
          description: 'Uma fatura aparece aqui assim que a primeira compra é lançada no cartão.',
          title: 'Nenhuma fatura ainda',
        }

  return (
    <Widget
      description='Selecione um ciclo para ver os itens.'
      state={state}
      surface={surface}
      title='Faturas'
    >
      <DataTable
        caption='Faturas do cartão'
        columns={columns}
        onRowSelect={(invoice) => onSelect(invoice.id)}
        rowKey={(invoice) => invoice.id}
        rows={invoices}
        selectedRowKey={selectedInvoiceId}
      />
    </Widget>
  )
}
