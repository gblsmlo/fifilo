import type { TransactionResponse } from '@fifilo/core/transactions'
import { ConfirmDialog } from '@fifilo/patterns/confirm-dialog'
import { errorCodeToSurfaceKind } from '@fifilo/patterns/state-kinds'
import { StateSurface } from '@fifilo/patterns/state-surface'
import { Badge } from '@fifilo/ui/components/badge'
import { Button } from '@fifilo/ui/components/button'
import { Card, CardContent, CardHeader, CardTitle } from '@fifilo/ui/components/card'
import { formatMoney } from '@libs/format-money'
import { useState } from 'react'

const KIND_LABELS: Record<TransactionResponse['kind'], string> = {
  expense: 'Despesa',
  income: 'Receita',
  transfer: 'Transferência',
}

export interface TransactionListError {
  code?: string
  message: string
  onRetry?: () => void
}

interface TransactionListProps {
  accountNamesById: ReadonlyMap<string, string>
  categoryNamesById: ReadonlyMap<string, string>
  error?: TransactionListError | null
  hasNextPage?: boolean
  isDeleting?: boolean
  isFetchingNextPage?: boolean
  onDelete: (id: string) => void
  onLoadMore?: () => void
  transactions: readonly TransactionResponse[]
}

export function TransactionList({
  accountNamesById,
  categoryNamesById,
  error = null,
  hasNextPage = false,
  isDeleting = false,
  isFetchingNextPage = false,
  onDelete,
  onLoadMore,
  transactions,
}: Readonly<TransactionListProps>) {
  const [pendingId, setPendingId] = useState<string | null>(null)
  const pending = transactions.find((transaction) => transaction.id === pendingId) ?? null

  if (error) {
    return (
      <StateSurface
        actions={
          error.onRetry ? [{ label: 'Tentar novamente', onPress: error.onRetry }] : undefined
        }
        description={error.message}
        kind={errorCodeToSurfaceKind(error.code)}
        title='Não foi possível carregar as transações'
      />
    )
  }

  if (transactions.length === 0) {
    return (
      <StateSurface
        description='Registre uma despesa, receita ou transferência para começar.'
        kind='empty'
        title='Nenhuma transação no período'
      />
    )
  }

  return (
    <div className='flex flex-col gap-2'>
      {transactions.map((transaction) => (
        <Card key={transaction.id}>
          <CardHeader className='flex-row items-center justify-between gap-4'>
            <div>
              <CardTitle>{transaction.description}</CardTitle>
              <p className='text-muted-foreground text-sm'>
                {transaction.occurredOn}
                {transaction.categoryId
                  ? ` · ${categoryNamesById.get(transaction.categoryId) ?? transaction.categoryId}`
                  : ''}
              </p>
            </div>
            <Badge variant='secondary'>{KIND_LABELS[transaction.kind]}</Badge>
          </CardHeader>
          <CardContent className='flex items-center justify-between gap-4'>
            <div className='flex flex-col gap-1'>
              {transaction.legs.map((leg) => (
                <span
                  className='text-sm'
                  data-negative={leg.amountMinor < 0}
                  key={`${transaction.id}-${leg.accountId}`}
                >
                  {accountNamesById.get(leg.accountId) ?? leg.accountId}:{' '}
                  {formatMoney({ amountMinor: leg.amountMinor, currency: 'BRL' })}
                </span>
              ))}
            </div>
            <Button onClick={() => setPendingId(transaction.id)} type='button' variant='ghost'>
              Excluir
            </Button>
          </CardContent>
        </Card>
      ))}

      {hasNextPage ? (
        <div className='flex justify-center pt-2'>
          <Button loading={isFetchingNextPage} onClick={onLoadMore} type='button' variant='outline'>
            Carregar mais
          </Button>
        </div>
      ) : null}

      <ConfirmDialog
        confirmLabel='Excluir'
        confirmingLabel='Excluindo…'
        description={
          pending ? `"${pending.description}" e suas pernas serão removidas permanentemente.` : ''
        }
        isConfirming={isDeleting}
        onConfirm={() => {
          if (pendingId) onDelete(pendingId)
          setPendingId(null)
        }}
        onOpenChange={(open) => {
          if (!open) setPendingId(null)
        }}
        open={pending !== null}
        title='Excluir transação?'
      />
    </div>
  )
}
