'use client'

import type { Table as TanstackTable } from '@tanstack/react-table'
import type React from 'react'
import { CollectionPagination } from '../collection/components/collection-pagination'

export interface DataGridPaginationProps<TData>
  extends Omit<React.ComponentProps<'div'>, 'children'> {
  table: TanstackTable<TData>
}

/**
 * Pagination footer of a TanStack table, client-side or controlled: it reads the
 * table model and hands it to `CollectionPagination`, which is the visual
 * authority — the table does not draw a pagination of its own.
 */
export function DataGridPagination<TData>({
  table,
  ...props
}: DataGridPaginationProps<TData>): React.ReactElement {
  const { pageIndex, pageSize } = table.getState().pagination

  return (
    <CollectionPagination
      data-slot='data-grid-pagination'
      label='Paginação da tabela'
      onPageChange={(page) => table.setPageIndex(page - 1)}
      page={pageIndex + 1}
      pageCount={table.getPageCount()}
      pageSize={pageSize}
      total={table.getRowCount()}
      {...props}
    />
  )
}
