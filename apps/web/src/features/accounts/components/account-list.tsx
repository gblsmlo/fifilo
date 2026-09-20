import type { AccountResponse } from '@fifilo/core/accounts'
import type { CurrencyCode } from '@fifilo/core/primitives'
import {
  type CollectionDefinition,
  CollectionViewOutlet,
  ListItem,
  ListItemActionsMenu,
  ListItemBody,
  ListItemDescription,
  ListItemField,
  ListItemLeading,
  ListItemTitle,
  ListItemTrailing,
} from '@fifilo/patterns/collection-views'
import { ConfirmDialog } from '@fifilo/patterns/confirm-dialog'
import { Dialog } from '@fifilo/patterns/dialog'
import { errorCodeToSurfaceKind } from '@fifilo/patterns/state-kinds'
import { StateGuard, type SurfaceGuardState } from '@fifilo/patterns/state-surface'
import { Avatar, AvatarFallback } from '@fifilo/ui/components/avatar'
import { Badge } from '@fifilo/ui/components/badge'
import { MenuItem } from '@fifilo/ui/components/menu'
import { Text } from '@fifilo/ui/components/text'
import { formatMoney } from '@libs/format-money'
import { Link } from '@tanstack/react-router'
import { CreditCardIcon } from 'lucide-react'
import { useState } from 'react'
import { accountInitials, resolveInstitution } from '../institutions'
import { AccountEditForm } from './forms/account-edit-form'

type AccountBalance = { amountMinor: number; currency: CurrencyCode }

const ACCOUNT_KIND_LABELS: Record<AccountResponse['kind'], string> = {
  checking: 'Conta corrente',
  credit_card: 'Cartão de crédito',
  investment: 'Investimento',
  savings: 'Poupança',
  wallet: 'Carteira',
}

export interface AccountListError {
  code?: string
  message: string
  onRetry?: () => void
}

interface AccountListProps {
  accounts: readonly AccountResponse[]
  balancesByAccountId: ReadonlyMap<string, AccountBalance>
  collection: CollectionDefinition<AccountResponse>
  error?: AccountListError | null
  isArchiving?: boolean
  isPending?: boolean
  onArchive: (id: string) => void
}

const resolveState = (
  error: AccountListError | null,
  isPending: boolean,
  isEmpty: boolean,
): SurfaceGuardState => {
  if (error) return errorCodeToSurfaceKind(error.code)
  if (isPending) return 'loading'
  if (isEmpty) return 'empty'
  return 'data'
}

/**
 * One row per account: the name and its institution on the left, the standing
 * and the balance as trailing fields, and everything the row can do behind the
 * actions menu.
 */
export function AccountList({
  accounts,
  balancesByAccountId,
  collection,
  error = null,
  isArchiving = false,
  isPending = false,
  onArchive,
}: Readonly<AccountListProps>) {
  const [pendingArchiveId, setPendingArchiveId] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const pendingAccount = accounts.find((account) => account.id === pendingArchiveId) ?? null
  const editingAccount = accounts.find((account) => account.id === editingId) ?? null
  const state = resolveState(error, isPending, accounts.length === 0)

  const surface = error
    ? {
        actions: error.onRetry
          ? [{ label: 'Tentar novamente', onPress: error.onRetry }]
          : undefined,
        description: error.message,
        title: 'Não foi possível carregar as contas',
      }
    : isPending
      ? { description: 'Buscando as contas do workspace.', title: 'Carregando contas' }
      : {
          description: 'Crie a primeira conta para começar a acompanhar o saldo do workspace.',
          title: 'Nenhuma conta ainda',
        }

  const renderAccount = (account: AccountResponse) => {
    const balance = balancesByAccountId.get(account.id)
    const institution = resolveInstitution(account.institution)

    return (
      // `group` is what turns the actions menu on at hover: the pattern styles
      // the trigger against it, and without it the menu only answers focus.
      <ListItem aria-label={account.name} className='group' key={account.id}>
        <ListItemLeading>
          <Avatar>
            <AvatarFallback
              className='text-white'
              style={institution ? { backgroundColor: institution.brandColor } : undefined}
            >
              {institution?.abbreviation ?? accountInitials(account.name)}
            </AvatarFallback>
          </Avatar>
        </ListItemLeading>
        <ListItemBody>
          <ListItemTitle>{account.name}</ListItemTitle>
          <ListItemDescription>
            {account.institution
              ? `${ACCOUNT_KIND_LABELS[account.kind]} · ${account.institution}`
              : ACCOUNT_KIND_LABELS[account.kind]}
          </ListItemDescription>
        </ListItemBody>
        <ListItemTrailing>
          {/* Only the standing worth saying: an account that takes entries is
              the norm, and a badge on every row says nothing. */}
          {account.archivedAt ? (
            <ListItemField always>
              <Badge variant='secondary'>Arquivada</Badge>
            </ListItemField>
          ) : null}
          <ListItemField always>
            <Text
              className='tabular-nums'
              data-negative={balance !== undefined && balance.amountMinor < 0}
              render={<span />}
              size='sm'
              weight='semibold'
            >
              {balance ? formatMoney(balance) : '—'}
            </Text>
          </ListItemField>
          <ListItemActionsMenu
            ariaLabel={`Ações da conta ${account.name}`}
            onEdit={() => setEditingId(account.id)}
          >
            {account.kind === 'credit_card' && !account.archivedAt ? (
              <MenuItem
                render={<Link params={{ accountId: account.id }} to='/credit-cards/$accountId' />}
              >
                <CreditCardIcon aria-hidden='true' />
                Gerenciar cartão
              </MenuItem>
            ) : null}
            {account.archivedAt ? null : (
              <MenuItem onClick={() => setPendingArchiveId(account.id)}>Arquivar</MenuItem>
            )}
          </ListItemActionsMenu>
        </ListItemTrailing>
      </ListItem>
    )
  }

  return (
    <>
      <StateGuard state={state} surface={surface}>
        <CollectionViewOutlet collection={collection} list={{}} renderListItem={renderAccount} />
      </StateGuard>

      <Dialog
        description='O tipo da conta não muda depois de criada.'
        onOpenChange={(open) => {
          if (!open) setEditingId(null)
        }}
        open={editingAccount !== null}
        title='Editar conta'
      >
        {editingAccount ? (
          <AccountEditForm account={editingAccount} onSaved={() => setEditingId(null)} />
        ) : null}
      </Dialog>

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
    </>
  )
}
