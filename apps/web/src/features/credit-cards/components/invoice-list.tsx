import type { InvoiceResponse } from '@fifilo/core/credit-cards'
import { errorCodeToSurfaceKind } from '@fifilo/patterns/state-kinds'
import { StateSurface } from '@fifilo/patterns/state-surface'
import { Badge } from '@fifilo/ui/components/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@fifilo/ui/components/card'
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
  onSelect: (invoiceId: string) => void
  selectedInvoiceId?: string | null
}

export function InvoiceList({
  error = null,
  invoices,
  onSelect,
  selectedInvoiceId = null,
}: Readonly<InvoiceListProps>) {
  if (error) {
    return (
      <StateSurface
        actions={
          error.onRetry ? [{ label: 'Tentar novamente', onPress: error.onRetry }] : undefined
        }
        description={error.message}
        kind={errorCodeToSurfaceKind(error.code)}
        title='Não foi possível carregar as faturas'
      />
    )
  }

  if (invoices.length === 0) {
    return (
      <StateSurface
        description='Uma fatura aparece aqui assim que a primeira compra é lançada no cartão.'
        kind='empty'
        title='Nenhuma fatura ainda'
      />
    )
  }

  return (
    <div className='flex flex-col gap-2'>
      {invoices.map((invoice) => (
        <Card
          className='cursor-pointer'
          data-selected={invoice.id === selectedInvoiceId}
          key={invoice.id}
          onClick={() => onSelect(invoice.id)}
        >
          <CardHeader className='flex-row items-center justify-between gap-4'>
            <div>
              <CardTitle>
                {invoice.periodStart} — {invoice.periodEnd}
              </CardTitle>
              <p className='text-muted-foreground text-sm'>Vencimento: {invoice.dueOn}</p>
            </div>
            <Badge variant={STATUS_VARIANTS[invoice.status]}>{STATUS_LABELS[invoice.status]}</Badge>
          </CardHeader>
          <CardContent>
            <span className='font-semibold text-lg'>
              {formatMoney({ amountMinor: invoice.totalMinor, currency: 'BRL' })}
            </span>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
