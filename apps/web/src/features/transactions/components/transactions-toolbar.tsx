import {
  Action,
  CollectionSearchField,
  CollectionToolbar,
  FilterRadioSubmenu,
  ViewSettingsMenu,
  ViewSettingsSection,
} from '@fifilo/patterns/collection-views'
import { type DateRange, RangeCalendar } from '@fifilo/patterns/range-calendar'
import { MenuSub, MenuSubPopup, MenuSubTrigger } from '@fifilo/ui/components/menu'
import { ArrowLeftRightIcon, CalendarDaysIcon, FolderIcon, WalletIcon } from 'lucide-react'
import type { TransactionsSearch } from '../route-search'

const KIND_OPTIONS = [
  ['expense', 'Despesa'],
  ['income', 'Receita'],
  ['transfer', 'Transferência'],
] as const satisfies readonly (readonly [string, string])[]

interface TransactionsToolbarProps {
  accounts: readonly { id: string; name: string }[]
  categories: readonly { id: string; name: string }[]
  from: string
  onCreate: () => void
  onSearchChange: (next: TransactionsSearch) => void
  search: TransactionsSearch
  to: string
}

/**
 * The civil date the contract carries, read as a local day: `new Date(civil)`
 * is midnight UTC and the calendar would land on the previous day west of it.
 */
const toLocalDay = (civil: string): Date => {
  const [year, month, day] = civil.split('-').map(Number) as [number, number, number]
  return new Date(year, month - 1, day)
}

const toCivilDay = (date: Date): string => {
  const pad = (value: number): string => String(value).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

export function TransactionsToolbar({
  accounts,
  categories,
  from,
  onCreate,
  onSearchChange,
  search,
  to,
}: Readonly<TransactionsToolbarProps>) {
  const activeFilterCount = [
    search.accountId,
    search.categoryId,
    search.from ?? search.to,
    search.kind,
    search.q,
  ].filter(Boolean).length

  const period: DateRange = { from: toLocalDay(from), to: toLocalDay(to) }

  const commitPeriod = (next: DateRange) => {
    onSearchChange({
      ...search,
      from: next.from ? toCivilDay(next.from) : undefined,
      to: next.to ? toCivilDay(next.to) : undefined,
    })
  }

  return (
    <CollectionToolbar
      aria-label='Controles das transações'
      endSlot={
        <>
          <ViewSettingsMenu
            activeFilterCount={activeFilterCount}
            onClearFilters={() =>
              onSearchChange({
                ...search,
                accountId: undefined,
                categoryId: undefined,
                from: undefined,
                kind: undefined,
                q: undefined,
                to: undefined,
              })
            }
          >
            <ViewSettingsSection label='Filtros'>
              <MenuSub>
                <MenuSubTrigger>
                  <CalendarDaysIcon aria-hidden='true' />
                  Período
                </MenuSubTrigger>
                <MenuSubPopup className='p-0'>
                  <RangeCalendar onValueChange={commitPeriod} value={period} />
                </MenuSubPopup>
              </MenuSub>
              <FilterRadioSubmenu
                clearLabel='Todos os tipos'
                icon={ArrowLeftRightIcon}
                label='Tipo'
                onValueChange={(value) =>
                  onSearchChange({
                    ...search,
                    kind: (value || undefined) as TransactionsSearch['kind'],
                  })
                }
                options={KIND_OPTIONS}
                value={search.kind}
              />
              <FilterRadioSubmenu
                clearLabel='Todas as contas'
                icon={WalletIcon}
                label='Conta'
                onValueChange={(value) =>
                  onSearchChange({ ...search, accountId: value || undefined })
                }
                options={accounts.map((account) => [account.id, account.name] as const)}
                value={search.accountId}
              />
              <FilterRadioSubmenu
                clearLabel='Todas as categorias'
                icon={FolderIcon}
                label='Categoria'
                onValueChange={(value) =>
                  onSearchChange({ ...search, categoryId: value || undefined })
                }
                options={categories.map((category) => [category.id, category.name] as const)}
                value={search.categoryId}
              />
            </ViewSettingsSection>
          </ViewSettingsMenu>
          <Action label='Nova transação' onClick={onCreate} />
        </>
      }
      startSlot={
        <CollectionSearchField
          label='Buscar transações'
          onCommit={(value) => onSearchChange({ ...search, q: value || undefined })}
          placeholder='Buscar descrição'
          value={search.q ?? ''}
        />
      }
    />
  )
}
