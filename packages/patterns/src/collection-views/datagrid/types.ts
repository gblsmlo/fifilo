import type { ColumnDef, RowData } from '@tanstack/react-table'

/**
 * Display variants understood by the default cell renderer.
 * Rendering variants supplied by the default COSS/Base UI view.
 */
export type DataGridCellVariant =
  | 'text'
  | 'number'
  | 'select'
  | 'checkbox'
  | 'date'
  | 'badge'
  | 'custom'

/** Semantic data types represented by DataGrid column header icons. */
export const DATA_GRID_COLUMN_TYPES = [
  'title',
  'text',
  'number',
  'select',
  'multi-select',
  'status',
  'date',
  'formula',
  'relation',
  'rollup',
  'person',
  'file',
  'checkbox',
  'url',
  'email',
  'phone',
  'created-time',
  'created-by',
  'last-edited-time',
  'last-edited-by',
  'button',
  'id',
  'place',
] as const

export type DataGridColumnType = (typeof DATA_GRID_COLUMN_TYPES)[number]

export type DataGridAlign = 'start' | 'center' | 'end'

/** Vertical density of grid rows, aligned with the Tablecn reference. */
export type DataGridDensity = 'short' | 'medium' | 'tall' | 'extra-tall'

export interface DataGridSelectOption {
  label: string
  value: string
}

/** Value change emitted by an interactive DataGrid cell. */
export interface DataGridCellValueChange {
  columnId: string
  rowId: string
  value: string
}

/**
 * Column meta consumed by the default cell renderer and column header.
 * Attach it to a column via `meta` in the column definition.
 */
export interface DataGridColumnMeta {
  /** Display variant. Defaults to `text`. */
  variant?: DataGridCellVariant
  /** Semantic data type represented by the column header icon. */
  type?: DataGridColumnType
  /** Horizontal alignment of header and cell content. */
  align?: DataGridAlign
  /** Human-readable column label, used by the column visibility menu. */
  label?: string
  /** Placeholder shown when a value is empty. */
  placeholder?: string
  /** Options for the `select` variant. */
  options?: DataGridSelectOption[]
  /** Enables the single-select control when the consumer supplies a change handler. */
  editable?: boolean
  /** Badge variant for the `badge` variant. */
  badgeVariant?:
    | 'default'
    | 'secondary'
    | 'outline'
    | 'destructive'
    | 'success'
    | 'warning'
    | 'info'
    | 'error'
}

declare module '@tanstack/react-table' {
  interface ColumnMeta<TData extends RowData, TValue> extends DataGridColumnMeta {}

  interface TableMeta<TData extends RowData> {
    dataGridDensity?: DataGridDensity
    dataGridPaginationRowOffset?: number
    onDataGridDensityChange?: (density: DataGridDensity) => void
    onDataGridCellValueChange?: (change: DataGridCellValueChange) => void
  }
}

/** Convenience alias for column definitions consumed by the grid. */
export type DataGridColumnDef<TData> = ColumnDef<TData, unknown>
