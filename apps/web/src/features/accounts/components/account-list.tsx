import type { AccountResponse } from '@fifilo/core/accounts'
import type { CurrencyCode } from '@fifilo/core/primitives'
import { ConfirmDialog } from '@fifilo/patterns/confirm-dialog'
import { DataTable, type DataTableColumn } from '@fifilo/patterns/data-table'
import { errorCodeToSurfaceKind } from '@fifilo/patterns/state-kinds'
import { Widget } from '@fifilo/patterns/widget'
import { Badge } from '@fifilo/ui/components/badge'
import { Button } from '@fifilo/ui/components/button'
import { Text } from '@fifilo/ui/components/text'
import { formatMoney } from '@libs/format-money'
import { Link } from '@tanstack/react-router'
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
  isPending?: boolean
  onArchive: (id: string) => void
}

const GROUP_SURFACE = {
  empty: {
    description: 'Crie a primeira conta para começar a acompanhar o saldo do workspace.',
    title: 'Nenhuma conta ainda',
  },
  loading: { description: 'Buscando as contas do workspace.', title: 'Carregando contas' },
} as const

/**
 * One widget per account kind, in the fixed order of `ACCOUNT_KIND_ORDER`,
 * each table closing with the group subtotal in its footer (the Coss
 * `p-table-7` shape). Network and mutation state stay in the page.
 */
export function AccountList({
  accounts,
  balancesByAccountId,
  error = null,
  isArchiving = false,
  isPending = false,
  onArchive,
}: Readonly<AccountListProps>) {
  const [pendingArchiveId, setPendingArchiveId] = useState<string | null>(null)
  const pendingAccount = accounts.find((account) => account.id === pendingArchiveId) ?? null

  if (error) {
    return (
      <Widget
        state={errorCodeToSurfaceKind(error.code)}
        surface={{
          actions: error.onRetry
            ? [{ label: 'Tentar novamente', onPress: error.onRetry }]
            : undefined,
          description: error.message,
          title: 'Não foi possível carregar as contas',
        }}
        title='Contas'
      />
    )
  }

  if (isPending) {
    return <Widget state='loading' surface={GROUP_SURFACE.loading} title='Contas' />
  }

  if (accounts.length === 0) {
    return <Widget state='empty' surface={GROUP_SURFACE.empty} title='Contas' />
  }

  const columns: DataTableColumn<AccountResponse>[] = [
    {
      cell: (account) => (
        <div className='flex flex-col gap-0.5'>
          <Text render={<span />} size='sm' weight='medium'>
            {account.name}
          </Text>
          {account.institution ? (
            <Text foreground='muted' render={<span />} size='xs'>
              {account.institution}
            </Text>
          ) : null}
        </div>
      ),
      header: 'Conta',
      id: 'name',
    },
    {
      cell: (account) => (account.archivedAt ? <Badge variant='secondary'>Arquivada</Badge> : null),
      header: 'Situação',
      id: 'status',
    },
    {
      align: 'end',
      cell: (account) => {
        const balance = balancesByAccountId.get(account.id)
        return (
          <Text
            className='tabular-nums'
            data-negative={balance !== undefined && balance.amountMinor < 0}
            render={<span />}
            size='sm'
            weight='semibold'
          >
            {balance ? formatMoney(balance) : '—'}
          </Text>
        )
      },
      header: 'Saldo',
      id: 'balance',
    },
    {
      align: 'end',
      cell: (account) => (
        <div className='flex items-center justify-end gap-1'>
          {account.kind === 'credit_card' && !account.archivedAt ? (
            <Button
              render={<Link params={{ accountId: account.id }} to='/credit-cards/$accountId' />}
              size='sm'
              variant='outline'
            >
              Gerenciar cartão
            </Button>
          ) : null}
          {!account.archivedAt ? (
            <Button
              onClick={() => setPendingArchiveId(account.id)}
              size='sm'
              type='button'
              variant='ghost'
            >
              Arquivar
            </Button>
          ) : null}
        </div>
      ),
      header: <span className='sr-only'>Ações</span>,
      id: 'actions',
    },
  ]

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
          <Widget key={group.kind} title={ACCOUNT_KIND_LABELS[group.kind]}>
            <DataTable
              caption={`Contas do tipo ${ACCOUNT_KIND_LABELS[group.kind]}`}
              columns={columns}
              footer={[
                'Total do grupo',
                <Text
                  className='tabular-nums'
                  key='total'
                  render={<span />}
                  size='sm'
                  weight='semibold'
                >
                  {formatMoney({ amountMinor: groupTotalMinor, currency: groupCurrency })}
                </Text>,
                null,
              ]}
              rowKey={(account) => account.id}
              rows={group.accounts}
            />
          </Widget>
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
