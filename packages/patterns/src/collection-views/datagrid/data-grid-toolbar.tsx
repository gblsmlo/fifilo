'use client'

import { Button } from '@fifilo/ui/components/button'
import { Input } from '@fifilo/ui/components/input'
import {
  MenuCheckboxItem,
  MenuItem,
  MenuRadioGroup,
  MenuRadioItem,
  MenuSeparator,
  MenuSub,
  MenuSubPopup,
  MenuSubTrigger,
} from '@fifilo/ui/components/menu'
import { Popover, PopoverPopup, PopoverTrigger } from '@fifilo/ui/components/popover'
import { cn } from '@fifilo/ui/lib/utils'
import type { Table as TanstackTable } from '@tanstack/react-table'
import {
  AlignVerticalSpaceAroundIcon,
  ArrowDownUpIcon,
  ChevronsDownUpIcon,
  Columns3Icon,
  EqualIcon,
  ListFilterIcon,
  MinusIcon,
} from 'lucide-react'
import type React from 'react'
import type { DataGridColumnMeta, DataGridDensity } from './types'

export interface DataGridFilterMenuProps<TData> {
  className?: string
  label?: string
  table: TanstackTable<TData>
}

/** Column filter controls derived from filterable TanStack columns. */
export function DataGridFilterMenu<TData>({
  className,
  label = 'Filtrar',
  table,
}: DataGridFilterMenuProps<TData>): React.ReactElement | null {
  const columns = table.getAllLeafColumns().filter((column) => column.getCanFilter())
  if (columns.length === 0) return null

  return (
    <Popover>
      <PopoverTrigger
        render={<Button aria-label={label} className={className} size='sm' variant='ghost' />}
      >
        <ListFilterIcon />
        {label}
      </PopoverTrigger>
      <PopoverPopup align='end' className='w-72'>
        <div className='flex flex-col gap-3' data-slot='data-grid-filter-menu'>
          <div>
            <h3 className='font-medium text-sm'>Filtrar por</h3>
            <p className='text-muted-foreground text-xs'>Preencha um ou mais campos.</p>
          </div>
          {columns.map((column) => {
            const meta = (column.columnDef.meta ?? {}) as DataGridColumnMeta
            const columnLabel = meta.label ?? column.id
            const inputId = `data-grid-filter-${column.id}`
            return (
              <label className='grid gap-1.5 text-sm' htmlFor={inputId} key={column.id}>
                <span className='font-medium'>{columnLabel}</span>
                <Input
                  aria-label={`Filtrar ${columnLabel}`}
                  id={inputId}
                  onChange={(event) => {
                    const value = event.target.value
                    column.setFilterValue(value || undefined)
                    table.setPageIndex(0)
                  }}
                  placeholder={`Buscar em ${columnLabel.toLocaleLowerCase('pt-BR')}…`}
                  value={String(column.getFilterValue() ?? '')}
                />
              </label>
            )
          })}
          {table.getState().columnFilters.length > 0 ? (
            <Button onClick={() => table.resetColumnFilters()} size='sm' variant='ghost'>
              Limpar filtros
            </Button>
          ) : null}
        </div>
      </PopoverPopup>
    </Popover>
  )
}

export interface DataGridSortSubmenuProps<TData> {
  label?: string
  table: TanstackTable<TData>
}

/**
 * Sorting as a section of `ViewSettingsMenu`, not as a neighbouring trigger.
 * Sorting remains TanStack Table state.
 */
export function DataGridSortSubmenu<TData>({
  label = 'Ordenar por',
  table,
}: DataGridSortSubmenuProps<TData>): React.ReactElement | null {
  const columns = table.getAllLeafColumns().filter((column) => column.getCanSort())
  if (columns.length === 0) return null

  return (
    <MenuSub>
      <MenuSubTrigger>
        <ArrowDownUpIcon aria-hidden='true' />
        {label}
      </MenuSubTrigger>
      <MenuSubPopup>
        {columns.flatMap((column) => {
          const meta = (column.columnDef.meta ?? {}) as DataGridColumnMeta
          const columnLabel = meta.label ?? column.id
          return [
            <MenuItem key={`${column.id}-asc`} onClick={() => column.toggleSorting(false)}>
              {columnLabel}: crescente
            </MenuItem>,
            <MenuItem key={`${column.id}-desc`} onClick={() => column.toggleSorting(true)}>
              {columnLabel}: decrescente
            </MenuItem>,
          ]
        })}
        {table.getState().sorting.length > 0 ? (
          <>
            <MenuSeparator />
            <MenuItem onClick={() => table.resetSorting()}>Limpar ordenação</MenuItem>
          </>
        ) : null}
      </MenuSubPopup>
    </MenuSub>
  )
}

interface DensityOption {
  icon: React.ComponentType<React.ComponentProps<'svg'>>
  label: string
  value: DataGridDensity
}

const DENSITIES: [DensityOption, ...DensityOption[]] = [
  { icon: MinusIcon, label: 'Compacta', value: 'short' },
  { icon: EqualIcon, label: 'Média', value: 'medium' },
  { icon: AlignVerticalSpaceAroundIcon, label: 'Alta', value: 'tall' },
  { icon: ChevronsDownUpIcon, label: 'Extra alta', value: 'extra-tall' },
]

export interface DataGridDensitySubmenuProps<TData> {
  label?: string
  table: TanstackTable<TData>
}

/** Row height as a section of `ViewSettingsMenu`. */
export function DataGridDensitySubmenu<TData>({
  label = 'Altura das linhas',
  table,
}: DataGridDensitySubmenuProps<TData>): React.ReactElement {
  const density = table.options.meta?.dataGridDensity ?? 'short'
  const selected = DENSITIES.find((option) => option.value === density) ?? DENSITIES[0]
  const SelectedIcon = selected.icon

  return (
    <MenuSub>
      <MenuSubTrigger>
        <SelectedIcon aria-hidden='true' />
        {label}
      </MenuSubTrigger>
      <MenuSubPopup>
        <MenuRadioGroup
          onValueChange={(value) =>
            table.options.meta?.onDataGridDensityChange?.(value as DataGridDensity)
          }
          value={density}
        >
          {DENSITIES.map((option) => (
            <MenuRadioItem indicatorSide='end' key={option.value} value={option.value}>
              <option.icon />
              {option.label}
            </MenuRadioItem>
          ))}
        </MenuRadioGroup>
      </MenuSubPopup>
    </MenuSub>
  )
}

export interface DataGridSearchProps<TData>
  extends Omit<React.ComponentProps<typeof Input>, 'onChange' | 'value' | 'type'> {
  table: TanstackTable<TData>
}

/** Client-side global search control. Server-controlled consumers can render their own input. */
export function DataGridSearch<TData>({
  'aria-label': ariaLabel,
  className,
  placeholder = 'Buscar…',
  table,
  ...props
}: DataGridSearchProps<TData>): React.ReactElement {
  const accessibleName = ariaLabel ?? placeholder

  return (
    <Input
      aria-label={accessibleName}
      className={cn('max-w-64', className)}
      data-slot='data-grid-search'
      onChange={(event) => {
        table.setGlobalFilter(event.target.value)
        table.setPageIndex(0)
      }}
      placeholder={placeholder}
      type='search'
      value={(table.getState().globalFilter as string) ?? ''}
      {...props}
    />
  )
}

export interface DataGridColumnsSubmenuProps<TData> {
  label?: string
  table: TanstackTable<TData>
}

/** Column visibility as a section of `ViewSettingsMenu`. */
export function DataGridColumnsSubmenu<TData>({
  label = 'Colunas',
  table,
}: DataGridColumnsSubmenuProps<TData>): React.ReactElement | null {
  const columns = table.getAllLeafColumns().filter((column) => column.getCanHide())
  if (columns.length === 0) return null

  return (
    <MenuSub>
      <MenuSubTrigger>
        <Columns3Icon aria-hidden='true' />
        {label}
      </MenuSubTrigger>
      <MenuSubPopup>
        {columns.map((column) => {
          const meta = (column.columnDef.meta ?? {}) as DataGridColumnMeta
          return (
            <MenuCheckboxItem
              checked={column.getIsVisible()}
              closeOnClick={false}
              key={column.id}
              onCheckedChange={(checked) => column.toggleVisibility(Boolean(checked))}
            >
              {meta.label ?? column.id}
            </MenuCheckboxItem>
          )
        })}
      </MenuSubPopup>
    </MenuSub>
  )
}

export interface DataGridSelectionSummaryProps<TData>
  extends Omit<React.ComponentProps<'span'>, 'children'> {
  table: TanstackTable<TData>
}

/** Live selection summary intended for contextual row-action toolbars. */
export function DataGridSelectionSummary<TData>({
  className,
  table,
  ...props
}: DataGridSelectionSummaryProps<TData>): React.ReactElement {
  const count = table.getSelectedRowModel().rows.length
  return (
    <span
      aria-live='polite'
      className={cn('px-2 text-muted-foreground text-sm tabular-nums', className)}
      data-slot='data-grid-selection-summary'
      {...props}
    >
      {count} {count === 1 ? 'selecionado' : 'selecionados'}
    </span>
  )
}
