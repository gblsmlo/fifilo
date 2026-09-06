import type { AccountResponse } from '@fifilo/core/accounts'
import type { CurrencyCode } from '@fifilo/core/primitives'
import { ConfirmDialog } from '@fifilo/patterns/confirm-dialog'
import { errorCodeToSurfaceKind } from '@fifilo/patterns/state-kinds'
import { StateSurface } from '@fifilo/patterns/state-surface'
import { Badge } from '@fifilo/ui/components/badge'
import { Button } from '@fifilo/ui/components/button'
import { Card, CardContent, CardHeader, CardTitle } from '@fifilo/ui/components/card'
import { formatMoney } from '@libs/format-money'
import { useState } from 'react'

type AccountBalance = { amountMinor: number; currency: CurrencyCode }

const ACCOUNT_KIND_LABELS: Record<AccountResponse['kind'], string> = {
  checking: 'Conta corrente',
  credit_card: 'Cartão de crédito',
  investment: 'Investimento',
  savings: 'Poupança',
  wallet: 'Carteira',
}

const ACCOUNT_KIND_ORDER: readonly AccountResponse['kind'][] = [
  'checking',
  'savings',
  'wallet',
  'credit_card',
  'investment',
]

export interface AccountListError {
  code?: string
  message: string
  onRetry?: () => void
}

interface AccountListProps {
  accounts: readonly AccountResponse[]
  balancesByAccountId: ReadonlyMap<string, AccountBalance>
  error?: AccountListError | null
  isArchiving?: boolean
  onArchive: (id: string) => void
}

export function AccountList({
  accounts,
  balancesByAccountId,
  error = null,
  isArchiving = false,
  onArchive,
}: Readonly<AccountListProps>) {
  const [pendingArchiveId, setPendingArchiveId] = useState<string | null>(null)
  const pendingAccount = accounts.find((account) => account.id === pendingArchiveId) ?? null

  if (error) {
    return (
      <StateSurface
        actions={
          error.onRetry ? [{ label: 'Tentar novamente', onPress: error.onRetry }] : undefined
        }
        description={error.message}
        kind={errorCodeToSurfaceKind(error.code)}
        title='Não foi possível carregar as contas'
      />
    )
  }

  if (accounts.length === 0) {
    return (
      <StateSurface
        description='Crie a primeira conta para começar a acompanhar o saldo do workspace.'
        kind='empty'
        title='Nenhuma conta ainda'
      />
    )
  }

  const groups = ACCOUNT_KIND_ORDER.map((kind) => ({
    accounts: accounts.filter((account) => account.kind === kind),
    kind,
  })).filter((group) => group.accounts.length > 0)

  return (
    <div className='flex flex-col gap-6'>
      {groups.map((group) => {
        const groupTotalMinor = group.accounts.reduce(
          (sum, account) => sum + (balancesByAccountId.get(account.id)?.amountMinor ?? 0),
          0,
        )
        const groupCurrency =
          balancesByAccountId.get(group.accounts[0]?.id ?? '')?.currency ?? 'BRL'

        return (
          <section aria-label={ACCOUNT_KIND_LABELS[group.kind]} key={group.kind}>
            <div className='mb-2 flex items-center justify-between'>
              <h2 className='font-medium text-muted-foreground text-sm uppercase tracking-wide'>
                {ACCOUNT_KIND_LABELS[group.kind]}
              </h2>
              <span className='font-medium text-sm'>
                {formatMoney({ amountMinor: groupTotalMinor, currency: groupCurrency })}
              </span>
            </div>

            <div className='flex flex-col gap-2'>
              {group.accounts.map((account) => {
                const balance = balancesByAccountId.get(account.id)

                return (
                  <Card key={account.id}>
                    <CardHeader className='flex-row items-center justify-between gap-4'>
                      <div>
                        <CardTitle>{account.name}</CardTitle>
                        {account.institution ? (
                          <p className='text-muted-foreground text-sm'>{account.institution}</p>
                        ) : null}
                      </div>
                      {account.archivedAt ? <Badge variant='secondary'>Arquivada</Badge> : null}
                    </CardHeader>
                    <CardContent className='flex items-center justify-between gap-4'>
                      <span
                        className='font-semibold text-lg'
                        data-negative={balance !== undefined && balance.amountMinor < 0}
                      >
                        {balance ? formatMoney(balance) : '—'}
                      </span>
                      {!account.archivedAt ? (
                        <Button
                          onClick={() => setPendingArchiveId(account.id)}
                          type='button'
                          variant='ghost'
                        >
                          Arquivar
                        </Button>
                      ) : null}
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          </section>
        )
      })}

      <ConfirmDialog
        confirmLabel='Arquivar'
        confirmingLabel='Arquivando…'
        description={
          pendingAccount
            ? `"${pendingAccount.name}" para de receber novos lançamentos, mas o histórico continua disponível.`
            : ''
        }
        isConfirming={isArchiving}
        onConfirm={() => {
          if (pendingArchiveId) onArchive(pendingArchiveId)
          setPendingArchiveId(null)
        }}
        onOpenChange={(open) => {
          if (!open) setPendingArchiveId(null)
        }}
        open={pendingAccount !== null}
        title='Arquivar conta?'
      />
    </div>
  )
}
