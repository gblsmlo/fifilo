'use client'

import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from '@fifilo/ui/components/table'
import { cn } from '@fifilo/ui/lib/utils'
import type { KeyboardEvent, ReactNode } from 'react'

export type DataTableAlign = 'start' | 'end'

export interface DataTableColumn<Row> {
  /** `end` right-aligns header and cells; amounts and counts go there. */
  align?: DataTableAlign
  cell: (row: Row) => ReactNode
  /** Extra classes for every body cell of the column. */
  className?: string
  header: ReactNode
  id: string
}

export interface DataTableProps<Row> {
  /** Name of the table for assistive technology; rendered visually hidden. */
  caption: string
  className?: string
  columns: readonly DataTableColumn<Row>[]
  /**
   * Summary row, one cell per column from the right. Fewer cells than columns
   * make the first one span the remaining columns, the Coss `p-table-7` shape:
   * `['Total', total]` under four columns spans the label across three.
   */
  footer?: readonly ReactNode[]
  /** Makes every row selectable by pointer and keyboard. */
  onRowSelect?: (row: Row) => void
  rowKey: (row: Row) => string
  rows: readonly Row[]
  selectedRowKey?: string | null
}

const ALIGN_CLASS: Record<DataTableAlign, string> = {
  end: 'text-right',
  start: 'text-left',
}

/**
 * The card table of the Coss table particles (`variant="card"`), neutral of
 * what a row is: the showcase declares columns and cells, the shell owns the
 * header, the row states and the summary row. Loading, empty and error are not
 * its concern; `Widget` guards them before the table mounts.
 */
export function DataTable<Row>({
  caption,
  className,
  columns,
  footer,
  onRowSelect,
  rowKey,
  rows,
  selectedRowKey = null,
}: Readonly<DataTableProps<Row>>) {
  const selectable = onRowSelect !== undefined
  const footerSpan = footer ? columns.length - footer.length + 1 : 0

  const selectOnKey = (row: Row) => (event: KeyboardEvent<HTMLTableRowElement>) => {
    if (event.target !== event.currentTarget) return
    if (event.key !== 'Enter' && event.key !== ' ') return
    event.preventDefault()
    onRowSelect?.(row)
  }

  return (
    <Table className={className} data-slot='data-table' variant='card'>
      <TableCaption className='sr-only'>{caption}</TableCaption>
      <TableHeader>
        <TableRow>
          {columns.map((column) => (
            <TableHead className={ALIGN_CLASS[column.align ?? 'start']} key={column.id}>
              {column.header}
            </TableHead>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row) => {
          const key = rowKey(row)
          const selected = selectedRowKey !== null && key === selectedRowKey

          return (
            <TableRow
              className={cn(selectable && 'cursor-pointer focus-visible:outline-none')}
              data-state={selected ? 'selected' : undefined}
              key={key}
              onClick={selectable ? () => onRowSelect(row) : undefined}
              onKeyDown={selectable ? selectOnKey(row) : undefined}
              tabIndex={selectable ? 0 : undefined}
            >
              {columns.map((column) => (
                <TableCell
                  className={cn(ALIGN_CLASS[column.align ?? 'start'], column.className)}
                  key={column.id}
                >
                  {column.cell(row)}
                </TableCell>
              ))}
            </TableRow>
          )
        })}
      </TableBody>
      {footer ? (
        <TableFooter>
          <TableRow>
            {footer.map((cell, index) => {
              const column = columns[columns.length - footer.length + index]
              return (
                <TableCell
                  className={ALIGN_CLASS[column?.align ?? 'start']}
                  colSpan={index === 0 ? footerSpan : undefined}
                  key={column?.id ?? index}
                >
                  {cell}
                </TableCell>
              )
            })}
          </TableRow>
        </TableFooter>
      ) : null}
    </Table>
  )
}
