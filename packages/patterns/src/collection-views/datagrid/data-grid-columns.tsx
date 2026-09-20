'use client'

import { Checkbox } from '@fifilo/ui/components/checkbox'
import type { ColumnDef } from '@tanstack/react-table'

/**
 * Row-selection column with header "select all" and per-row checkboxes.
 * Place it first in your column list and pair with `enableRowSelection` on the grid.
 */
export function createSelectColumn<TData>(
  options: { showRowNumbers?: boolean; size?: number } = {},
): ColumnDef<TData, unknown> {
  const showRowNumbers = options.showRowNumbers ?? true

  return {
    id: 'select',
    meta: { align: 'center' },
    size: options.size ?? 44,
    enableSorting: false,
    enableHiding: false,
    enablePinning: false,
    enableResizing: false,
    header: ({ table }) => (
      <div className='flex items-center justify-center'>
        <Checkbox
          aria-label='Selecionar todos os registros'
          checked={table.getIsAllPageRowsSelected()}
          indeterminate={table.getIsSomePageRowsSelected()}
          onCheckedChange={(checked) => table.toggleAllPageRowsSelected(Boolean(checked))}
        />
      </div>
    ),
    cell: ({ row }) => (
      <div className='group/marker relative flex size-full items-center justify-center'>
        {showRowNumbers ? (
          <span
            aria-hidden='true'
            className='text-muted-foreground text-xs tabular-nums group-hover/marker:opacity-0 group-data-[state=selected]/marker:opacity-0'
            data-slot='data-grid-row-marker'
          >
            {row.index + 1}
          </span>
        ) : null}
        <Checkbox
          aria-label='Selecionar registro'
          checked={row.getIsSelected()}
          className={
            showRowNumbers
              ? 'absolute opacity-0 group-hover/marker:opacity-100 data-checked:opacity-100'
              : undefined
          }
          disabled={!row.getCanSelect()}
          onCheckedChange={(checked) => row.toggleSelected(Boolean(checked))}
        />
      </div>
    ),
  }
}
