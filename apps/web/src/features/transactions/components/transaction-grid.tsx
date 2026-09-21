import { CategoryForm } from '@features/categories'
import type { TransactionResponse } from '@fifilo/core/transactions'
import {
  type CollectionDefinition,
  CollectionViewOutlet,
  type DataGridColumnDef,
  useDataGrid,
} from '@fifilo/patterns/collection-views'
import { ConfirmDialog } from '@fifilo/patterns/confirm-dialog'
import { Dialog } from '@fifilo/patterns/dialog'
import {
  DateProperty,
  SelectProperty,
  type SelectPropertyOption,
} from '@fifilo/patterns/properties'
import { errorCodeToSurfaceKind } from '@fifilo/patterns/state-kinds'
import { StateGuard, type SurfaceGuardState } from '@fifilo/patterns/state-surface'
import { Button } from '@fifilo/ui/components/button'
import { Text } from '@fifilo/ui/components/text'
import { formatMoney } from '@libs/format-money'
import { useMemo, useState } from 'react'
import type { TransactionChange } from '../hooks/use-update-transaction'
import { type PendingKindChange, TransactionKindDialog } from './transaction-kind-dialog'

/**
 * `occurredOn` is a calendar day, and the picker hands back an instant: read in
 * UTC, the day it printed is the day that travels.
 */
const toCivilDay = (date: Date): string => {
  const pad = (value: number): string => String(value).padStart(2, '0')
  return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}`
}

/** The row as it already is, so an edit to one field keeps the rest. */
const toSameKindChange = (transaction: TransactionResponse): TransactionChange | null => {
  const [first, second] = transaction.legs

  if (transaction.kind === 'transfer') {
    return first && second
      ? { fromAccountId: first.accountId, kind: 'transfer', toAccountId: second.accountId }
      : null
  }

  return first && transaction.categoryId
    ? { accountId: first.accountId, categoryId: transaction.categoryId, kind: transaction.kind }
    : null
}

const KIND_LABELS: Record<TransactionResponse['kind'], string> = {
  expense: 'Despesa',
  income: 'Receita',
  transfer: 'Transferência',
}

/** A dot, not a glyph: the colour is the whole message, and a shape would compete with it. */
const KindDot = (props: React.SVGProps<SVGSVGElement>) => (
  <svg aria-hidden='true' viewBox='0 0 8 8' {...props}>
    <circle cx='4' cy='4' fill='currentColor' r='4' />
  </svg>
)

const KIND_OPTIONS: Record<TransactionResponse['kind'], SelectPropertyOption> = {
  expense: { icon: KindDot, label: KIND_LABELS.expense, tone: 'danger', value: 'expense' },
  income: { icon: KindDot, label: KIND_LABELS.income, tone: 'success', value: 'income' },
  transfer: { icon: KindDot, label: KIND_LABELS.transfer, tone: 'neutral', value: 'transfer' },
}

export interface TransactionGridError {
  code?: string
  message: string
  onRetry?: () => void
}

export interface TransactionGridAccount {
  id: string
  name: string
}

export interface TransactionGridCategory {
  id: string
  kind: 'expense' | 'income'
  name: string
}

interface TransactionGridProps {
  accounts: readonly TransactionGridAccount[]
  categories: readonly TransactionGridCategory[]
  collection: CollectionDefinition<TransactionResponse>
  error?: TransactionGridError | null
  hasNextPage?: boolean
  isDeleting?: boolean
  isFetchingNextPage?: boolean
  isPending?: boolean
  /** Absent, kind and category read without a way to change them. */
  onChange?: (transaction: TransactionResponse, change: TransactionChange) => void
  onDelete: (id: string) => void
  onLoadMore?: () => void
  transactions: readonly TransactionResponse[]
}

const resolveState = (
  error: TransactionGridError | null,
  isPending: boolean,
  isEmpty: boolean,
): SurfaceGuardState => {
  if (error) return errorCodeToSurfaceKind(error.code)
  if (isPending) return 'loading'
  if (isEmpty) return 'empty'
  return 'data'
}

export function TransactionGrid({
  accounts,
  categories,
  collection,
  error = null,
  hasNextPage = false,
  isDeleting = false,
  isFetchingNextPage = false,
  isPending = false,
  onChange,
  onDelete,
  onLoadMore,
  transactions,
}: Readonly<TransactionGridProps>) {
  const [pendingId, setPendingId] = useState<string | null>(null)
  const [creatingCategory, setCreatingCategory] = useState(false)
  const [pendingKind, setPendingKind] = useState<PendingKindChange | null>(null)
  const accountNamesById = useMemo(
    () => new Map(accounts.map((account) => [account.id, account.name])),
    [accounts],
  )
  const pending = transactions.find((transaction) => transaction.id === pendingId) ?? null
  const state = resolveState(error, isPending, transactions.length === 0)

  const surface = error
    ? {
        actions: error.onRetry
          ? [{ label: 'Tentar novamente', onPress: error.onRetry }]
          : undefined,
        description: error.message,
        title: 'Não foi possível carregar as transações',
      }
    : isPending
      ? { description: 'Buscando os lançamentos do período.', title: 'Carregando transações' }
      : {
          // The opening balance is a dated entry, deliberately not a
          // transaction (Decision 021), so it counts in the total and never
          // shows up in this list. Saying so here is what keeps a funded
          // account with an empty history from reading as a bug.
          description:
            'O saldo inicial das suas contas já está no total. Registre uma despesa, receita ou transferência para o histórico começar.',
          title: 'Nenhuma transação no período',
        }

  const columns = useMemo<DataGridColumnDef<TransactionResponse>[]>(
    () => [
      {
        accessorKey: 'occurredOn',
        cell: ({ row }) => (
          <DateProperty
            allowClear={false}
            ariaLabel='Data'
            locale='pt-BR'
            readOnly={!onChange}
            serializeDate={toCivilDay}
            value={row.original.occurredOn}
            variant='plain'
            onValueChange={(occurredOn) => {
              const change = toSameKindChange(row.original)
              if (!occurredOn || !change) return
              onChange?.(row.original, { ...change, occurredOn })
            }}
          />
        ),
        header: 'Data',
        meta: { label: 'Data', type: 'date' },
        minSize: 104,
        size: 116,
      },
      {
        accessorKey: 'description',
        cell: ({ row }) => (
          <Text className='truncate' render={<span />} size='sm' weight='medium'>
            {row.original.description}
          </Text>
        ),
        enableHiding: false,
        header: 'Descrição',
        meta: { label: 'Descrição', type: 'title' },
        minSize: 140,
        size: 168,
      },
      {
        // A transfer moves money between the workspace's own accounts, so the
        // contract gives it no category to change.
        cell: ({ row }) => (
          <SelectProperty
            ariaLabel='Categoria'
            disabled={row.original.kind === 'transfer'}
            options={
              row.original.kind === 'transfer'
                ? []
                : categories
                    .filter((category) => category.kind === row.original.kind)
                    .map((category) => ({ label: category.name, value: category.id }))
            }
            footerAction={{ label: 'Nova categoria', onSelect: () => setCreatingCategory(true) }}
            placeholder={row.original.kind === 'transfer' ? 'Sem categoria' : 'Definir categoria'}
            readOnly={!onChange || row.original.kind === 'transfer'}
            searchEmptyLabel='Nenhuma categoria encontrada.'
            searchPlaceholder='Buscar categoria'
            value={row.original.categoryId}
            variant='plain'
            onValueChange={(categoryId) => {
              const accountId = row.original.legs[0]?.accountId
              if (!categoryId || !accountId || row.original.kind === 'transfer') return
              onChange?.(row.original, { accountId, categoryId, kind: row.original.kind })
            }}
          />
        ),
        header: 'Categoria',
        id: 'category',
        meta: { label: 'Categoria', type: 'select' },
        minSize: 120,
        size: 140,
      },
      {
        accessorKey: 'kind',
        // Each kind carries different fields, so the choice made here only opens
        // the dialog that collects them; nothing is written until it is complete.
        cell: ({ row }) => (
          <SelectProperty
            ariaLabel='Tipo'
            options={[KIND_OPTIONS.income, KIND_OPTIONS.expense, KIND_OPTIONS.transfer]}
            readOnly={!onChange}
            value={row.original.kind}
            variant='plain'
            onValueChange={(kind) => {
              if (kind && kind !== row.original.kind) {
                setPendingKind({
                  kind: kind as TransactionResponse['kind'],
                  transaction: row.original,
                })
              }
            }}
          />
        ),
        header: 'Tipo',
        meta: { label: 'Tipo', type: 'status' },
        minSize: 116,
        size: 130,
      },
      {
        // One line per leg, in the same order as Movimentação: a transfer reads
        // across the two columns, account beside its own amount. It also keeps
        // both of its accounts, which one trigger cannot choose between — the
        // kind dialog is where a transfer picks them.
        cell: ({ row }) => {
          const { kind, legs } = row.original
          const [leg] = legs

          if (kind === 'transfer' || !leg || accounts.length < 2) {
            return (
              <div className='flex min-w-0 flex-col gap-0.5'>
                {legs.map((each) => (
                  <Text
                    className='truncate'
                    key={`${row.original.id}-${each.accountId}`}
                    render={<span />}
                    size='sm'
                  >
                    {accountNamesById.get(each.accountId) ?? each.accountId}
                  </Text>
                ))}
              </div>
            )
          }

          return (
            <SelectProperty
              ariaLabel='Conta'
              options={accounts.map((account) => ({ label: account.name, value: account.id }))}
              readOnly={!onChange}
              searchEmptyLabel='Nenhuma conta encontrada.'
              searchPlaceholder='Buscar conta'
              value={leg.accountId}
              variant='plain'
              onValueChange={(accountId) => {
                const categoryId = row.original.categoryId
                if (!accountId || !categoryId) return
                onChange?.(row.original, { accountId, categoryId, kind })
              }}
            />
          )
        },
        header: 'Conta',
        id: 'account',
        meta: { label: 'Conta', type: 'relation' },
        minSize: 110,
        size: 140,
      },
      {
        cell: ({ row }) => (
          <div className='flex min-w-0 flex-col items-end gap-0.5'>
            {row.original.legs.map((leg) => (
              <Text
                className='tabular-nums'
                data-negative={leg.amountMinor < 0}
                key={`${row.original.id}-${leg.accountId}`}
                render={<span />}
                size='sm'
              >
                {formatMoney({ amountMinor: leg.amountMinor, currency: 'BRL' })}
              </Text>
            ))}
          </div>
        ),
        header: 'Movimentação',
        id: 'legs',
        meta: { align: 'end', label: 'Movimentação', type: 'number' },
        minSize: 100,
        size: 110,
      },
      {
        cell: ({ row }) => (
          <Button
            onClick={() => setPendingId(row.original.id)}
            size='sm'
            type='button'
            variant='ghost'
          >
            Excluir
          </Button>
        ),
        enableHiding: false,
        enablePinning: true,
        enableSorting: false,
        header: 'Ações',
        id: 'actions',
        meta: { align: 'end', label: 'Ações' },
        minSize: 80,
        size: 80,
      },
    ],
    [accountNamesById, accounts, categories, onChange],
  )

  const { table } = useDataGrid<TransactionResponse>({
    columns,
    data: transactions as TransactionResponse[],
    getRowId: (transaction) => transaction.id,
    // Seven columns pass the viewport width, and a delete that scrolls out of
    // reach is worse than a narrower row.
    tableOptions: { initialState: { columnPinning: { right: ['actions'] } } },
  })

  const footer =
    state === 'data' && hasNextPage ? (
      <div className='flex items-center justify-between gap-2'>
        <Text foreground='muted' render={<p />} size='sm'>
          {transactions.length} lançamentos carregados
        </Text>
        <Button
          loading={isFetchingNextPage}
          onClick={onLoadMore}
          size='sm'
          type='button'
          variant='outline'
        >
          Carregar mais
        </Button>
      </div>
    ) : null

  return (
    <>
      <StateGuard state={state} surface={surface}>
        <CollectionViewOutlet
          collection={collection}
          datagrid={{ 'aria-label': 'Lançamentos do período', pagination: false, table }}
        />
      </StateGuard>
      {footer}

      <TransactionKindDialog
        accounts={accounts}
        categories={categories}
        onConfirm={(transaction, change) => {
          onChange?.(transaction, change)
          setPendingKind(null)
        }}
        onCreateCategory={() => setCreatingCategory(true)}
        onOpenChange={(open) => {
          if (!open) setPendingKind(null)
        }}
        pending={pendingKind}
      />

      <Dialog
        description='A categoria entra na lista assim que for criada.'
        onOpenChange={setCreatingCategory}
        open={creatingCategory}
        title='Nova categoria'
      >
        <CategoryForm onCreated={() => setCreatingCategory(false)} />
      </Dialog>

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
    </>
  )
}
