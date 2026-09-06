import type { InvoiceItemResponse, InvoiceResponse } from '@fifilo/core/credit-cards'
import { errorCodeToSurfaceKind } from '@fifilo/patterns/state-kinds'
import { StateSurface } from '@fifilo/patterns/state-surface'
import { Badge } from '@fifilo/ui/components/badge'
import { Button } from '@fifilo/ui/components/button'
import { Card, CardContent, CardHeader, CardTitle } from '@fifilo/ui/components/card'
import { formatMoney } from '@libs/format-money'
import { useState } from 'react'

const STATUS_LABELS: Record<InvoiceResponse['status'], string> = {
  closed: 'Fechada',
  open: 'Aberta',
  overdue: 'Vencida',
  paid: 'Paga',
}

interface SelectOption {
  id: string
  name: string
}

export interface InvoiceDetailError {
  code?: string
  message: string
  onRetry?: () => void
}

interface InvoiceDetailProps {
  error?: InvoiceDetailError | null
  invoice: InvoiceResponse | null
  isClosing?: boolean
  isPaying?: boolean
  items: readonly InvoiceItemResponse[]
  onClose: () => void
  onPay: (fromAccountId: string) => void
  payFromAccountOptions: readonly SelectOption[]
}

const groupByDay = (
  items: readonly InvoiceItemResponse[],
): ReadonlyArray<[string, InvoiceItemResponse[]]> => {
  const byDay = new Map<string, InvoiceItemResponse[]>()
  for (const item of items) {
    const day = byDay.get(item.occurredOn) ?? []
    day.push(item)
    byDay.set(item.occurredOn, day)
  }
  return [...byDay.entries()].sort(([a], [b]) => (a < b ? -1 : 1))
}

export function InvoiceDetail({
  error = null,
  invoice,
  isClosing = false,
  isPaying = false,
  items,
  onClose,
  onPay,
  payFromAccountOptions,
}: Readonly<InvoiceDetailProps>) {
  const [payFromAccountId, setPayFromAccountId] = useState('')

  if (error) {
    return (
      <StateSurface
        actions={
          error.onRetry ? [{ label: 'Tentar novamente', onPress: error.onRetry }] : undefined
        }
        description={error.message}
        kind={errorCodeToSurfaceKind(error.code)}
        title='Não foi possível carregar a fatura'
      />
    )
  }

  if (!invoice) {
    return (
      <StateSurface
        description='Selecione uma fatura na lista para ver os itens.'
        kind='empty'
        title='Nenhuma fatura selecionada'
      />
    )
  }

  const groups = groupByDay(items)

  return (
    <div className='flex flex-col gap-4'>
      <Card>
        <CardHeader className='flex-row items-center justify-between gap-4'>
          <div>
            <CardTitle>
              {invoice.periodStart} — {invoice.periodEnd}
            </CardTitle>
            <p className='text-muted-foreground text-sm'>Vencimento: {invoice.dueOn}</p>
          </div>
          <Badge>{STATUS_LABELS[invoice.status]}</Badge>
        </CardHeader>
        <CardContent className='flex items-center justify-between gap-4'>
          <span className='font-semibold text-lg'>
            {formatMoney({ amountMinor: invoice.totalMinor, currency: 'BRL' })}
          </span>
          <div className='flex items-center gap-2'>
            {invoice.status === 'open' ? (
              <Button loading={isClosing} onClick={onClose} type='button'>
                Fechar fatura
              </Button>
            ) : null}
            {invoice.status === 'closed' || invoice.status === 'overdue' ? (
              <>
                <select
                  className='h-9 rounded-md border border-input bg-transparent px-3 text-sm'
                  onChange={(event) => setPayFromAccountId(event.target.value)}
                  value={payFromAccountId}
                >
                  <option value=''>Pagar com…</option>
                  {payFromAccountOptions.map((account) => (
                    <option key={account.id} value={account.id}>
                      {account.name}
                    </option>
                  ))}
                </select>
                <Button
                  disabled={!payFromAccountId}
                  loading={isPaying}
                  onClick={() => onPay(payFromAccountId)}
                  type='button'
                >
                  Pagar fatura
                </Button>
              </>
            ) : null}
          </div>
        </CardContent>
      </Card>

      {items.length === 0 ? (
        <StateSurface
          description='Nenhuma compra caiu nessa fatura ainda.'
          kind='empty'
          title='Fatura vazia'
        />
      ) : (
        groups.map(([day, dayItems]) => (
          <div key={day}>
            <h3 className='mb-2 font-medium text-muted-foreground text-sm'>{day}</h3>
            <div className='flex flex-col gap-2'>
              {dayItems.map((item) => (
                <Card key={item.id}>
                  <CardContent className='flex items-center justify-between gap-4'>
                    <span>
                      {item.description}
                      {item.installmentNumber ? ` (parcela ${item.installmentNumber})` : ''}
                    </span>
                    <span data-negative={item.amountMinor < 0}>
                      {formatMoney({ amountMinor: item.amountMinor, currency: 'BRL' })}
                    </span>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        ))
      )}
    </div>
  )
}
