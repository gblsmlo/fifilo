'use client'

import { Badge } from '@fifilo/ui/components/badge'
import {
  Select,
  SelectItem,
  SelectPopup,
  SelectPrimitive,
  SelectValue,
} from '@fifilo/ui/components/select'
import { cn } from '@fifilo/ui/lib/utils'
import type { CellContext } from '@tanstack/react-table'
import { CheckIcon, MinusIcon } from 'lucide-react'
import type { DataGridAlign, DataGridColumnMeta } from './types'

const ALIGN_CLASS: Record<DataGridAlign, string> = {
  center: 'text-center justify-center',
  end: 'text-end justify-end',
  start: 'text-start justify-start',
}

function toStringValue(value: unknown): string {
  if (value === null || value === undefined) return ''
  return String(value)
}

const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/

function parseDate(value: unknown): Date {
  if (value instanceof Date) return value
  const raw = String(value)

  // `new Date('2026-08-04')` is midnight UTC, and `toLocaleDateString` returns
  // it in the local zone: in any negative offset the date shown goes back a day.
  return DATE_ONLY.test(raw) ? new Date(`${raw}T00:00:00`) : new Date(raw)
}

function formatDate(value: unknown): string {
  if (!value) return ''
  const date = parseDate(value)
  if (Number.isNaN(date.getTime())) return toStringValue(value)
  return date.toLocaleDateString()
}

/**
 * Default renderer. Single-select interaction is opt-in through column meta;
 * domain validation and mutation remain owned by the consumer callback.
 */
export function DataGridCell<TData>({ context }: { context: CellContext<TData, unknown> }) {
  const { column, getValue, row, table } = context
  const meta = (column.columnDef.meta ?? {}) as DataGridColumnMeta
  const variant = meta.variant ?? 'text'
  const align = ALIGN_CLASS[meta.align ?? 'start']
  const value = getValue()

  switch (variant) {
    case 'checkbox': {
      const checked = Boolean(value)
      return (
        <span className={cn('flex items-center text-muted-foreground', align)}>
          {checked ? <CheckIcon className='size-4' /> : <MinusIcon className='size-4 opacity-40' />}
        </span>
      )
    }

    case 'select': {
      const options = meta.options ?? []
      const selectedOption = options.find((option) => option.value === toStringValue(value))
      const onValueChange = table.options.meta?.onDataGridCellValueChange

      if (meta.editable && onValueChange && options.length > 0) {
        const accessibleValue = selectedOption?.label ?? meta.placeholder ?? 'Sem valor'
        return (
          <Select
            itemToStringLabel={(option) => option.label}
            itemToStringValue={(option) => option.value}
            items={options}
            onValueChange={(option) => {
              if (!option) return
              onValueChange({
                columnId: column.id,
                rowId: row.id,
                value: option.value,
              })
            }}
            value={selectedOption ?? null}
          >
            <SelectPrimitive.Trigger
              aria-label={`${meta.label ?? column.id}: ${accessibleValue}`}
              data-grid-select-trigger
              render={
                <Badge
                  className='max-w-full'
                  render={<button type='button' />}
                  variant={meta.badgeVariant ?? 'secondary'}
                />
              }
            >
              <SelectValue className='min-w-0' placeholder={meta.placeholder ?? 'Selecionar'} />
            </SelectPrimitive.Trigger>
            <SelectPopup alignItemWithTrigger={false}>
              {options.map((option) => (
                <SelectItem key={option.value} value={option}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectPopup>
          </Select>
        )
      }

      return (
        <span className={cn('block truncate px-1', align)}>
          {selectedOption?.label ?? toStringValue(value)}
        </span>
      )
    }

    case 'date': {
      return <span className={cn('block truncate px-1', align)}>{formatDate(value)}</span>
    }

    case 'badge': {
      if (value === null || value === undefined || value === '') {
        return <span className='px-1 text-muted-foreground/72'>{meta.placeholder ?? ''}</span>
      }
      const label =
        meta.options?.find((option) => option.value === toStringValue(value))?.label ??
        toStringValue(value)
      return (
        <span className={cn('flex', align)}>
          <Badge variant={meta.badgeVariant ?? 'secondary'}>{label}</Badge>
        </span>
      )
    }

    case 'number': {
      return (
        <span className={cn('block truncate px-1 tabular-nums', align)}>
          {toStringValue(value)}
        </span>
      )
    }

    default: {
      return <span className={cn('block truncate px-1', align)}>{toStringValue(value)}</span>
    }
  }
}
