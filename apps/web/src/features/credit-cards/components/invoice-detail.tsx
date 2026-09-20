import type { InvoiceItemResponse, InvoiceResponse } from '@fifilo/core/credit-cards'
import { DataTable, type DataTableColumn } from '@fifilo/patterns/data-table'
import { errorCodeToSurfaceKind } from '@fifilo/patterns/state-kinds'
import { Widget } from '@fifilo/patterns/widget'
import { Badge } from '@fifilo/ui/components/badge'
import { Button } from '@fifilo/ui/components/button'
import {
  Select,
  SelectItem,
  SelectPopup,
  SelectTrigger,
  SelectValue,
} from '@fifilo/ui/components/select'
import { Text } from '@fifilo/ui/components/text'
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

const money = (amountMinor: number) => formatMoney({ amountMinor, currency: 'BRL' })

const columns: DataTableColumn<InvoiceItemResponse>[] = [
  {
    cell: (item) => (
      <Text className='tabular-nums' foreground='muted' render={<span />} size='sm'>
        {item.occurredOn}
      </Text>
    ),
    header: 'Data',
    id: 'date',
  },
  {
    cell: (item) => (
      <Text render={<span />} size='sm' weight='medium'>
        {item.description}
        {item.installmentNumber ? ` (parcela ${item.installmentNumber})` : ''}
      </Text>
    ),
    header: 'Descrição',
    id: 'description',
  },
  {
    align: 'end',
    cell: (item) => (
      <Text
        className='tabular-nums'
        data-negative={item.amountMinor < 0}
        render={<span />}
        size='sm'
        weight='semibold'
      >
        {money(item.amountMinor)}
      </Text>
    ),
    header: 'Valor',
    id: 'amount',
  },
]

const byDay = (items: readonly InvoiceItemResponse[]) =>
  [...items].sort((a, b) =>
    a.occurredOn < b.occurredOn ? -1 : a.occurredOn > b.occurredOn ? 1 : 0,
  )

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
      <Widget
        state={errorCodeToSurfaceKind(error.code)}
        surface={{
          actions: error.onRetry
            ? [{ label: 'Tentar novamente', onPress: error.onRetry }]
            : undefined,
          description: error.message,
          title: 'Não foi possível carregar a fatura',
        }}
        title='Fatura'
      />
    )
  }

  if (!invoice) {
    return (
      <Widget
        state='empty'
        surface={{
          description: 'Selecione uma fatura na lista para ver os itens.',
          title: 'Nenhuma fatura selecionada',
        }}
        title='Fatura'
      />
    )
  }

  const canPay = invoice.status === 'closed' || invoice.status === 'overdue'

  const footer =
    invoice.status === 'open' || canPay ? (
      <div className='flex flex-wrap items-center justify-end gap-2'>
        {invoice.status === 'open' ? (
          <Button loading={isClosing} onClick={onClose} size='sm' type='button'>
            Fechar fatura
          </Button>
        ) : null}
        {canPay ? (
          <>
            <Select
              onValueChange={(value) => setPayFromAccountId(value === 'none' ? '' : (value ?? ''))}
              value={payFromAccountId || 'none'}
            >
              <SelectTrigger aria-label='Pagar com'>
                <SelectValue placeholder='Pagar com…'>
                  {(value) =>
                    value === 'none'
                      ? 'Pagar com…'
                      : (payFromAccountOptions.find((account) => account.id === value)?.name ??
                        value)
                  }
                </SelectValue>
              </SelectTrigger>
              <SelectPopup>
                <SelectItem value='none'>Pagar com…</SelectItem>
                {payFromAccountOptions.map((account) => (
                  <SelectItem key={account.id} value={account.id}>
                    {account.name}
                  </SelectItem>
                ))}
              </SelectPopup>
            </Select>
            <Button
              disabled={!payFromAccountId}
              loading={isPaying}
              onClick={() => onPay(payFromAccountId)}
              size='sm'
              type='button'
            >
              Pagar fatura
            </Button>
          </>
        ) : null}
      </div>
    ) : undefined

  return (
    <Widget
      action={<Badge>{STATUS_LABELS[invoice.status]}</Badge>}
      description={`Vencimento: ${invoice.dueOn}`}
      footer={footer}
      state={items.length === 0 ? 'empty' : 'data'}
      surface={{
        description: 'Nenhuma compra caiu nessa fatura ainda.',
        title: 'Fatura vazia',
      }}
      title={`${invoice.periodStart} — ${invoice.periodEnd}`}
    >
      <DataTable
        caption='Itens da fatura'
        columns={columns}
        footer={[
          'Total da fatura',
          <Text className='tabular-nums' key='total' render={<span />} size='sm' weight='semibold'>
            {money(invoice.totalMinor)}
          </Text>,
        ]}
        rowKey={(item) => item.id}
        rows={byDay(items)}
      />
    </Widget>
  )
}
