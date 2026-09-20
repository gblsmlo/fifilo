// biome-ignore-all lint/a11y/useSemanticElements: a virtualizable spreadsheet uses the WAI-ARIA grid pattern instead of table layout elements

'use client'

import { Button } from '@fifilo/ui/components/button'
import { Menu, MenuItem, MenuPopup, MenuSeparator, MenuTrigger } from '@fifilo/ui/components/menu'
import { ScrollAreaPrimitive, ScrollBar } from '@fifilo/ui/components/scroll-area'
import { Skeleton } from '@fifilo/ui/components/skeleton'
import { cn } from '@fifilo/ui/lib/utils'
import {
  type Column,
  type Header,
  type Table as TanstackTable,
  flexRender,
} from '@tanstack/react-table'
import { observeElementRect, useVirtualizer } from '@tanstack/react-virtual'
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  ChevronsUpDownIcon,
  EyeOffIcon,
  PinIcon,
  PinOffIcon,
  PlusIcon,
} from 'lucide-react'
import {
  type CSSProperties,
  type KeyboardEvent,
  type MouseEvent,
  type PointerEvent,
  type ReactNode,
  useEffect,
  useRef,
  useState,
} from 'react'
import { DataGridColumnTypeIcon } from './data-grid-column-types'
import { DataGridPagination } from './data-grid-pagination'
import type { DataGridAlign, DataGridColumnMeta, DataGridDensity } from './types'

const HEADER_ALIGN: Record<DataGridAlign, string> = {
  center: 'justify-center',
  end: 'justify-end',
  start: 'justify-start',
}

const ROW_DENSITY: Record<DataGridDensity, string> = {
  'extra-tall': 'min-h-18',
  medium: 'min-h-11',
  short: 'min-h-9',
  tall: 'min-h-14',
}

const CELL_DENSITY: Record<DataGridDensity, string> = {
  'extra-tall': 'px-3 py-4',
  medium: 'px-2.5 py-2',
  short: 'px-2 py-1.5',
  tall: 'px-3 py-3',
}

const ROW_HEIGHT: Record<DataGridDensity, number> = {
  'extra-tall': 72,
  medium: 44,
  short: 36,
  tall: 56,
}

const DRAG_SCROLL_THRESHOLD_PX = 8
const DRAG_SCROLL_EXCLUDED_TARGETS = [
  'a',
  'button',
  'input',
  'select',
  'textarea',
  '[contenteditable="true"]',
  '[data-grid-select-trigger]',
  '[role="button"]',
  '[role="checkbox"]',
  '[role="combobox"]',
  '[role="columnheader"]',
  '[role="menuitem"]',
  '[role="menuitemcheckbox"]',
  '[role="option"]',
  '[role="separator"]',
].join(',')

interface DragScrollGesture {
  dragging: boolean
  pointerId: number
  startScrollLeft: number
  startX: number
  startY: number
}

interface SuppressedDragClick {
  until: number
  x: number
  y: number
}

function moveColumn<TData>(table: TanstackTable<TData>, columnId: string, direction: -1 | 1) {
  const leafIds = table.getAllLeafColumns().map((column) => column.id)
  const state = table.getState().columnOrder
  const order = state.length ? [...state] : leafIds
  const from = order.indexOf(columnId)
  const to = from + direction
  if (from === -1 || to < 0 || to >= order.length) return
  const [moved] = order.splice(from, 1)
  if (!moved) return
  order.splice(to, 0, moved)
  table.setColumnOrder(order)
}

function DataGridColumnHeader<TData>({ header }: { header: Header<TData, unknown> }) {
  const { column } = header
  const meta = (column.columnDef.meta ?? {}) as DataGridColumnMeta
  const align = HEADER_ALIGN[meta.align ?? 'start']
  const canSort = column.getCanSort()
  const canHide = column.getCanHide()
  const canPin = column.getCanPin()
  const sorted = column.getIsSorted()
  const table = header.getContext().table
  const visibleLeafColumns = table.getVisibleLeafColumns()
  const isLastColumn = visibleLeafColumns[visibleLeafColumns.length - 1]?.id === column.id
  const label = flexRender(column.columnDef.header, header.getContext())
  const showMenu = canSort || canHide || canPin

  return (
    <div className={cn('flex size-full min-w-0 items-center gap-1', align)}>
      {showMenu ? (
        <Menu modal={false}>
          <MenuTrigger
            aria-label={`Opções da coluna ${meta.label ?? column.id}`}
            className={cn(
              'flex size-full min-w-0 items-center gap-1.5 rounded-sm px-1 font-medium outline-none hover:bg-accent/40 focus-visible:ring-1 focus-visible:ring-ring data-popup-open:bg-accent/40',
              align,
            )}
          >
            {meta.type ? <DataGridColumnTypeIcon type={meta.type} /> : null}
            <span className='truncate'>{label}</span>
            {sorted === 'asc' ? (
              <ChevronUpIcon className='size-3.5 shrink-0 text-muted-foreground' />
            ) : sorted === 'desc' ? (
              <ChevronDownIcon className='size-3.5 shrink-0 text-muted-foreground' />
            ) : null}
            <ChevronDownIcon className='ms-auto size-3.5 shrink-0 text-muted-foreground' />
          </MenuTrigger>
          <MenuPopup align='end'>
            {canSort ? (
              <>
                <MenuItem onClick={() => column.toggleSorting(false)}>
                  <ChevronUpIcon />
                  Ordem crescente
                </MenuItem>
                <MenuItem onClick={() => column.toggleSorting(true)}>
                  <ChevronDownIcon />
                  Ordem decrescente
                </MenuItem>
                {sorted ? (
                  <MenuItem onClick={() => column.clearSorting()}>
                    <ChevronsUpDownIcon />
                    Limpar ordenação
                  </MenuItem>
                ) : null}
                <MenuSeparator />
              </>
            ) : null}
            <MenuItem onClick={() => moveColumn(table, column.id, -1)}>
              <ArrowLeftIcon />
              Mover para esquerda
            </MenuItem>
            <MenuItem onClick={() => moveColumn(table, column.id, 1)}>
              <ArrowRightIcon />
              Mover para direita
            </MenuItem>
            {canPin ? (
              <>
                <MenuSeparator />
                {column.getIsPinned() ? (
                  <MenuItem onClick={() => column.pin(false)}>
                    <PinOffIcon />
                    Desafixar coluna
                  </MenuItem>
                ) : (
                  <>
                    <MenuItem onClick={() => column.pin('left')}>
                      <PinIcon />
                      Fixar à esquerda
                    </MenuItem>
                    <MenuItem onClick={() => column.pin('right')}>
                      <PinIcon />
                      Fixar à direita
                    </MenuItem>
                  </>
                )}
              </>
            ) : null}
            {canHide ? (
              <>
                <MenuSeparator />
                <MenuItem onClick={() => column.toggleVisibility(false)}>
                  <EyeOffIcon />
                  Ocultar coluna
                </MenuItem>
              </>
            ) : null}
          </MenuPopup>
        </Menu>
      ) : (
        <div
          className={cn(
            'flex min-w-0 flex-1 items-center gap-1.5 truncate px-1 font-medium',
            align,
          )}
        >
          {meta.type ? <DataGridColumnTypeIcon type={meta.type} /> : null}
          <span className='truncate'>{label}</span>
        </div>
      )}

      {column.getCanResize() ? (
        <div
          aria-label={`Redimensionar coluna ${meta.label ?? column.id}`}
          aria-orientation='vertical'
          aria-valuemax={column.columnDef.maxSize}
          aria-valuemin={column.columnDef.minSize}
          aria-valuenow={column.getSize()}
          className={cn(
            'absolute top-0 z-20 h-full w-0.5 cursor-ew-resize touch-none select-none bg-border outline-none after:absolute after:inset-y-0 after:start-1/2 after:w-4 hover:bg-primary focus-visible:bg-primary',
            // In the last column the handle and its grab area grow inwards: growing
            // outwards they would add 8px of scroll beyond the content, and the
            // empty strip on the right reads as one more column.
            isLastColumn ? 'end-0 after:-translate-x-full' : '-end-px after:-translate-x-1/2',
            column.getIsResizing() && 'bg-primary',
          )}
          onDoubleClick={() => column.resetSize()}
          onKeyDown={(event) => {
            const delta = event.key === 'ArrowLeft' ? -8 : event.key === 'ArrowRight' ? 8 : 0
            if (!delta) return
            event.preventDefault()
            table.setColumnSizing((current) => ({
              ...current,
              [column.id]: column.getSize() + delta,
            }))
          }}
          onMouseDown={header.getResizeHandler()}
          onTouchStart={header.getResizeHandler()}
          role='separator'
          tabIndex={0}
        />
      ) : null}
    </div>
  )
}

export interface DataGridProps<TData> {
  table: TanstackTable<TData>
  /**
   * Shows the default pagination in the footer. By default it follows the table
   * model: with `enablePagination` in `useDataGrid` the pagination appears,
   * without it it does not. Pass `false` for the collection to scroll whole
   * instead of paginating.
   */
  pagination?: boolean
  /**
   * The column that absorbs the horizontal slack. By default it is the last
   * ordinary column — without it the grid would end before the edge, leaving an
   * empty strip. `false` turns the fill off and every column keeps its declared
   * width.
   */
  fillColumn?: string | false
  /** Takes the footer in place of the default pagination. */
  footer?: ReactNode
  density?: DataGridDensity
  isLoading?: boolean
  loadingRowCount?: number
  emptyMessage?: string
  maxHeight?: number | string
  getRowGroup?: (row: TData) => string | null
  getRowSelected?: (row: TData) => boolean
  onRowAdd?: () => void | Promise<void>
  addRowLabel?: string
  virtualize?: boolean
  overscan?: number
  className?: string
  'aria-label'?: string
}

function columnStyle(size: number, fill = false): CSSProperties {
  return {
    flex: `${fill ? 1 : 0} 0 ${size}px`,
    minWidth: size,
    width: size,
  }
}

function pinnedColumnStyle<TData>(
  column: Column<TData, unknown>,
  fillColumnId?: string,
): CSSProperties {
  const pinned = column.getIsPinned()
  return {
    ...columnStyle(column.getSize(), !pinned && column.id === fillColumnId),
    ...(pinned === 'left'
      ? { left: column.getStart('left'), position: 'sticky', zIndex: 5 }
      : pinned === 'right'
        ? { position: 'sticky', right: column.getAfter('right'), zIndex: 5 }
        : {}),
  }
}

function cellKey(rowId: string, columnId: string) {
  return JSON.stringify([rowId, columnId])
}

function parseCellKey(key: string): [rowId: string, columnId: string] {
  return JSON.parse(key) as [string, string]
}

function isDragScrollExcludedTarget(target: EventTarget | null) {
  return target instanceof Element && Boolean(target.closest(DRAG_SCROLL_EXCLUDED_TARGETS))
}

export function DataGrid<TData>({
  table,
  pagination,
  fillColumn,
  footer,
  density: densityProp,
  isLoading = false,
  loadingRowCount = 5,
  emptyMessage = 'Nenhum registro para exibir.',
  maxHeight,
  getRowGroup,
  getRowSelected,
  onRowAdd,
  addRowLabel = 'Adicionar linha',
  virtualize = false,
  overscan = 8,
  className,
  'aria-label': ariaLabel,
}: DataGridProps<TData>) {
  const showsPagination = pagination ?? Boolean(table.options.getPaginationRowModel)
  const footerContent = footer ?? (showsPagination ? <DataGridPagination table={table} /> : null)
  const leafColumns = table.getVisibleLeafColumns()
  const lastCommonColumnId = [...leafColumns]
    .reverse()
    .find(
      (column) => !column.getIsPinned() && column.id !== 'select' && column.id !== 'actions',
    )?.id
  const fillColumnId = fillColumn === false ? undefined : (fillColumn ?? lastCommonColumnId)
  const rows = table.getRowModel().rows
  const collectionRows = table.getSortedRowModel().rows
  const collectionRowCount = table.getRowCount()
  const headerRowCount = table.getHeaderGroups().length
  const groupRowCount = getRowGroup
    ? new Set(collectionRows.map((row) => getRowGroup(row.original)).filter(Boolean)).size
    : 0
  const bodyRowCount = isLoading
    ? loadingRowCount
    : collectionRowCount === 0
      ? 1
      : collectionRowCount + groupRowCount
  const ariaRowCount = headerRowCount + bodyRowCount + (onRowAdd ? 1 : 0)
  const density = densityProp ?? table.options.meta?.dataGridDensity ?? 'short'
  const firstNavigableColumn = Math.max(
    0,
    leafColumns.findIndex((column) => column.id !== 'select' && column.id !== 'actions'),
  )
  const initialFocusedColumnId = leafColumns[firstNavigableColumn]?.id
  const initialFocusedRowId = rows[0]?.id
  const initialFocusedCell = { columnId: initialFocusedColumnId, rowId: initialFocusedRowId }
  const [focusedCell, setFocusedCell] = useState(initialFocusedCell)
  const [hasInteracted, setHasInteracted] = useState(false)
  const [selectedCells, setSelectedCells] = useState<Set<string>>(() => new Set())
  const [isDragScrolling, setIsDragScrolling] = useState(false)
  const cellRefs = useRef(new Map<string, HTMLDivElement>())
  const pendingSelectCellClickRef = useRef<{ cellKey: string; timestamp: number } | null>(null)
  const gridRef = useRef<HTMLDivElement>(null)
  const dragScrollGestureRef = useRef<DragScrollGesture | null>(null)
  const suppressedDragClickRef = useRef<SuppressedDragClick | null>(null)
  const shouldVirtualize = virtualize && !getRowGroup && !isLoading && rows.length > 0
  const rowVirtualizer = useVirtualizer({
    count: shouldVirtualize ? rows.length : 0,
    estimateSize: () => ROW_HEIGHT[density],
    getItemKey: (index) => rows[index]?.id ?? index,
    getScrollElement: () => gridRef.current,
    initialRect:
      typeof maxHeight === 'number'
        ? { height: maxHeight, width: table.getTotalSize() }
        : undefined,
    observeElementRect: (instance, callback) =>
      observeElementRect(instance, (rect) =>
        callback({
          height: rect.height || (typeof maxHeight === 'number' ? maxHeight : 600),
          width: rect.width || table.getTotalSize(),
        }),
      ),
    overscan,
    useFlushSync: false,
  })
  let lastGroup: string | null = null
  let renderedGroupCount = 0

  const focusedCellIsAvailable =
    rows.some((row) => row.id === focusedCell.rowId) &&
    leafColumns.some((column) => column.id === focusedCell.columnId)
  const activeFocusedCell = focusedCellIsAvailable ? focusedCell : initialFocusedCell

  useEffect(() => {
    if (focusedCellIsAvailable) return
    setFocusedCell({ columnId: initialFocusedColumnId, rowId: initialFocusedRowId })
  }, [focusedCellIsAvailable, initialFocusedColumnId, initialFocusedRowId])

  useEffect(() => {
    const availableRowIds = new Set(collectionRows.map((row) => row.id))
    const visibleColumnIds = new Set(leafColumns.map((column) => column.id))

    setSelectedCells((current) => {
      const next = new Set(
        [...current].filter((key) => {
          const [rowId, columnId] = parseCellKey(key)
          return availableRowIds.has(rowId) && visibleColumnIds.has(columnId)
        }),
      )
      return next.size === current.size ? current : next
    })
  }, [collectionRows, leafColumns])

  function getCollectionRowIndex(row: (typeof rows)[number], fallbackIndex: number) {
    const paginationRowOffset = table.options.meta?.dataGridPaginationRowOffset ?? 0
    if (paginationRowOffset > 0) {
      return paginationRowOffset + fallbackIndex
    }

    const collectionIndex = collectionRows.findIndex(
      (collectionRow) => collectionRow.id === row.id || collectionRow.original === row.original,
    )
    return collectionIndex >= 0 ? collectionIndex : (row.index ?? fallbackIndex)
  }

  function selectCell(rowId: string, columnIndex: number, extend = false) {
    const columnId = leafColumns[columnIndex]?.id
    if (!columnId) return
    const key = cellKey(rowId, columnId)
    setHasInteracted(true)
    setFocusedCell({ columnId, rowId })
    setSelectedCells((current) => {
      if (!extend) return new Set([key])
      const next = new Set(current)
      next.add(key)
      return next
    })
  }

  function scrollVirtualRowIntoView(rowIndex: number) {
    const grid = gridRef.current
    if (!grid) return
    const rowHeight = ROW_HEIGHT[density]
    const headerHeight =
      grid.querySelector<HTMLElement>('[data-slot="data-grid-header"]')?.clientHeight || 36
    const bottomHeight = onRowAdd || footerContent ? 36 : 0
    const viewportHeight = grid.clientHeight || (typeof maxHeight === 'number' ? maxHeight : 600)
    const bodyViewportHeight = Math.max(rowHeight, viewportHeight - headerHeight - bottomHeight)
    const rowStart = rowIndex * rowHeight
    const rowEnd = rowStart + rowHeight
    const bodyScrollStart = Math.max(0, grid.scrollTop - headerHeight)

    if (rowStart < bodyScrollStart) {
      grid.scrollTo({ behavior: 'auto', top: rowStart })
    } else if (rowEnd > bodyScrollStart + bodyViewportHeight) {
      grid.scrollTo({ behavior: 'auto', top: rowEnd - bodyViewportHeight + headerHeight })
    }
  }

  function onCellKeyDown(
    event: KeyboardEvent<HTMLDivElement>,
    rowIndex: number,
    columnIndex: number,
  ) {
    let nextRow = rowIndex
    let nextColumn = columnIndex

    if (event.key === 'ArrowLeft') nextColumn -= 1
    else if (event.key === 'ArrowRight') nextColumn += 1
    else if (event.key === 'ArrowUp') nextRow -= 1
    else if (event.key === 'ArrowDown') nextRow += 1
    else if (event.key === 'Home') {
      nextColumn = firstNavigableColumn
      if (event.ctrlKey || event.metaKey) nextRow = 0
    } else if (event.key === 'End') {
      nextColumn = leafColumns.length - 1
      if (event.ctrlKey || event.metaKey) nextRow = rows.length - 1
    } else return

    event.preventDefault()
    nextRow = Math.max(0, Math.min(rows.length - 1, nextRow))
    nextColumn = Math.max(firstNavigableColumn, Math.min(leafColumns.length - 1, nextColumn))
    if (shouldVirtualize && nextRow !== rowIndex) {
      scrollVirtualRowIntoView(nextRow)
    }
    const nextRowId = rows[nextRow]?.id
    const nextColumnId = leafColumns[nextColumn]?.id
    if (!(nextRowId && nextColumnId)) return
    selectCell(nextRowId, nextColumn, event.shiftKey)
    queueMicrotask(() => cellRefs.current.get(cellKey(nextRowId, nextColumnId))?.focus())
  }

  function isSelectCell(element: HTMLDivElement) {
    return Boolean(element.querySelector('[data-grid-select-trigger]'))
  }

  function onSelectCellPointerDownCapture(
    event: PointerEvent<HTMLDivElement>,
    rowId: string,
    columnIndex: number,
    isSelected: boolean,
  ) {
    if (isSelected || !isSelectCell(event.currentTarget)) return

    event.preventDefault()
    event.stopPropagation()
    pendingSelectCellClickRef.current = {
      cellKey: cellKey(rowId, leafColumns[columnIndex]?.id ?? ''),
      timestamp: performance.now(),
    }
    selectCell(rowId, columnIndex, event.shiftKey)
  }

  function onSelectCellClickCapture(
    event: MouseEvent<HTMLDivElement>,
    rowId: string,
    columnIndex: number,
    isSelected: boolean,
  ) {
    const currentCellKey = cellKey(rowId, leafColumns[columnIndex]?.id ?? '')
    const pendingClick = pendingSelectCellClickRef.current
    const isFirstPointerClick =
      pendingClick?.cellKey === currentCellKey && performance.now() - pendingClick.timestamp < 750

    if (isFirstPointerClick) {
      event.preventDefault()
      event.stopPropagation()
      pendingSelectCellClickRef.current = null
      return
    }

    if (isSelected || !isSelectCell(event.currentTarget)) return

    event.preventDefault()
    event.stopPropagation()
    selectCell(rowId, columnIndex, event.shiftKey)
  }

  function onSelectCellMouseDownCapture(
    event: MouseEvent<HTMLDivElement>,
    rowId: string,
    columnIndex: number,
    isSelected: boolean,
  ) {
    const currentCellKey = cellKey(rowId, leafColumns[columnIndex]?.id ?? '')
    const pendingClick = pendingSelectCellClickRef.current
    const isFirstPointerPress =
      pendingClick?.cellKey === currentCellKey && performance.now() - pendingClick.timestamp < 750

    if (isFirstPointerPress) {
      event.preventDefault()
      event.stopPropagation()
      return
    }

    if (isSelected || !isSelectCell(event.currentTarget)) return

    event.preventDefault()
    event.stopPropagation()
    pendingSelectCellClickRef.current = { cellKey: currentCellKey, timestamp: performance.now() }
    selectCell(rowId, columnIndex, event.shiftKey)
  }

  function onCellClick(
    event: MouseEvent<HTMLDivElement>,
    rowId: string,
    columnIndex: number,
    isSelected: boolean,
  ) {
    selectCell(rowId, columnIndex, event.shiftKey)

    if (!isSelected) return

    const selectTrigger = event.currentTarget.querySelector<HTMLElement>(
      '[data-grid-select-trigger]',
    )
    if (!selectTrigger || selectTrigger.contains(event.target as Node)) return

    selectTrigger.click()
  }

  function releaseDragScrollCapture(grid: HTMLDivElement, pointerId: number) {
    if (grid.hasPointerCapture?.(pointerId)) {
      grid.releasePointerCapture(pointerId)
    }
  }

  function resetDragScrollGesture(grid?: HTMLDivElement) {
    const gesture = dragScrollGestureRef.current
    if (grid && gesture) releaseDragScrollCapture(grid, gesture.pointerId)
    dragScrollGestureRef.current = null
    setIsDragScrolling(false)
  }

  function onGridPointerDown(event: PointerEvent<HTMLDivElement>) {
    if (
      event.button !== 0 ||
      event.pointerType === 'touch' ||
      isDragScrollExcludedTarget(event.target)
    ) {
      return
    }

    const grid = event.currentTarget
    if (grid.scrollWidth <= grid.clientWidth) return

    dragScrollGestureRef.current = {
      dragging: false,
      pointerId: event.pointerId,
      startScrollLeft: grid.scrollLeft,
      startX: event.clientX,
      startY: event.clientY,
    }
  }

  function onGridPointerMove(event: PointerEvent<HTMLDivElement>) {
    const gesture = dragScrollGestureRef.current
    if (!gesture || gesture.pointerId !== event.pointerId) return

    const deltaX = event.clientX - gesture.startX
    const deltaY = event.clientY - gesture.startY
    const horizontalMovement = Math.abs(deltaX)
    const verticalMovement = Math.abs(deltaY)

    if (!gesture.dragging) {
      if (horizontalMovement < DRAG_SCROLL_THRESHOLD_PX || horizontalMovement <= verticalMovement) {
        return
      }
      event.currentTarget.setPointerCapture?.(event.pointerId)
      gesture.dragging = true
      setIsDragScrolling(true)
    }

    event.preventDefault()
    event.currentTarget.scrollLeft = Math.max(
      0,
      Math.min(
        event.currentTarget.scrollWidth - event.currentTarget.clientWidth,
        gesture.startScrollLeft - deltaX,
      ),
    )
  }

  function onGridPointerEnd(event: PointerEvent<HTMLDivElement>) {
    const gesture = dragScrollGestureRef.current
    if (!gesture || gesture.pointerId !== event.pointerId) return
    if (gesture.dragging) {
      suppressedDragClickRef.current = {
        until: performance.now() + 500,
        x: event.clientX,
        y: event.clientY,
      }
    }
    resetDragScrollGesture(event.currentTarget)
  }

  function onGridClickCapture(event: MouseEvent<HTMLDivElement>) {
    const suppressedClick = suppressedDragClickRef.current
    if (!suppressedClick) return

    const isExpired = performance.now() > suppressedClick.until
    const isReleaseClick =
      Math.abs(event.clientX - suppressedClick.x) <= DRAG_SCROLL_THRESHOLD_PX &&
      Math.abs(event.clientY - suppressedClick.y) <= DRAG_SCROLL_THRESHOLD_PX

    if (isExpired || !isReleaseClick) {
      suppressedDragClickRef.current = null
      return
    }
    suppressedDragClickRef.current = null
    event.preventDefault()
    event.stopPropagation()
  }

  function renderDataRow(
    row: (typeof rows)[number],
    rowIndex: number,
    virtualStyle?: CSSProperties,
    ariaRowIndex = headerRowCount + getCollectionRowIndex(row, rowIndex) + 1,
  ) {
    const selected = getRowSelected?.(row.original) || row.getIsSelected()

    return (
      <div
        aria-rowindex={ariaRowIndex}
        aria-selected={selected}
        className={cn(
          'group flex w-full border-b transition-colors last:border-b-0 hover:bg-accent/40 data-[state=selected]:bg-primary/10',
          ROW_DENSITY[density],
          virtualStyle && 'absolute start-0 top-0',
        )}
        data-slot='data-grid-row'
        data-state={selected ? 'selected' : undefined}
        key={row.id}
        role='row'
        style={virtualStyle}
        tabIndex={-1}
      >
        {row.getVisibleCells().map((cell, columnIndex) => {
          const currentCellKey = cellKey(row.id, cell.column.id)
          const isFocused =
            activeFocusedCell.rowId === row.id && activeFocusedCell.columnId === cell.column.id
          const isSelected = selectedCells.has(currentCellKey)
          return (
            <div
              aria-colindex={columnIndex + 1}
              aria-selected={isSelected}
              className={cn(
                'flex min-w-0 items-center overflow-hidden border-e outline-none last:border-e-0 data-[pinned]:bg-background data-[selected=true]:bg-primary/10 data-[focused=true]:ring-1 data-[focused=true]:ring-inset data-[focused=true]:ring-ring',
                CELL_DENSITY[density],
              )}
              data-focused={isFocused && hasInteracted ? 'true' : undefined}
              data-selected={isSelected ? 'true' : undefined}
              data-column-id={cell.column.id}
              data-pinned={cell.column.getIsPinned() || undefined}
              data-slot='data-grid-cell'
              key={cell.id}
              onClickCapture={(event) =>
                onSelectCellClickCapture(event, row.id, columnIndex, isSelected)
              }
              onClick={(event) => onCellClick(event, row.id, columnIndex, isSelected)}
              onKeyDown={(event) => {
                if (event.target !== event.currentTarget) return
                onCellKeyDown(event, rowIndex, columnIndex)
              }}
              onMouseDownCapture={(event) =>
                onSelectCellMouseDownCapture(event, row.id, columnIndex, isSelected)
              }
              onPointerDownCapture={(event) =>
                onSelectCellPointerDownCapture(event, row.id, columnIndex, isSelected)
              }
              ref={(node) => {
                if (node) {
                  cellRefs.current.set(currentCellKey, node)
                  // Only pulls focus from outside the cell. An inner control — the
                  // editable cell's trigger — is already the right focus, and
                  // stealing it would close the popup the click just opened.
                  if (hasInteracted && isFocused && !node.contains(document.activeElement)) {
                    queueMicrotask(() => {
                      if (!node.contains(document.activeElement)) node.focus()
                    })
                  }
                } else cellRefs.current.delete(currentCellKey)
              }}
              role='gridcell'
              style={pinnedColumnStyle(cell.column, fillColumnId)}
              tabIndex={isFocused ? 0 : -1}
            >
              {flexRender(cell.column.columnDef.cell, cell.getContext())}
            </div>
          )
        })}
      </div>
    )
  }

  return (
    <ScrollAreaPrimitive.Root
      className={cn(
        'relative h-auto rounded-md border bg-background text-sm',
        // With no growing column, stretching would leave a borderless strip on the
        // right reading as a phantom column: the frame shrinks to the columns and
        // still scrolls when they pass the container.
        fillColumnId ? 'w-full' : 'w-fit max-w-full',
        className,
      )}
      data-slot='data-grid'
    >
      <ScrollAreaPrimitive.Viewport
        aria-busy={isLoading || undefined}
        aria-colcount={leafColumns.length}
        aria-label={ariaLabel}
        aria-rowcount={ariaRowCount}
        className='grid h-full cursor-grab select-none rounded-[inherit] outline-none transition-shadows focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-background data-[drag-scroll=dragging]:cursor-grabbing data-has-overflow-x:overscroll-x-contain data-has-overflow-y:overscroll-y-contain'
        data-density={density}
        data-drag-scroll={isDragScrolling ? 'dragging' : undefined}
        data-slot='scroll-area-viewport'
        onClickCapture={onGridClickCapture}
        onLostPointerCapture={onGridPointerEnd}
        onPointerCancel={onGridPointerEnd}
        onPointerDownCapture={onGridPointerDown}
        onPointerMove={onGridPointerMove}
        onPointerUp={onGridPointerEnd}
        ref={gridRef}
        role='grid'
        style={{ maxHeight }}
        tabIndex={rows.length > 0 && !isLoading ? -1 : 0}
      >
        <ScrollAreaPrimitive.Content data-slot='scroll-area-content' style={{ minWidth: 0 }}>
          <div
            className='sticky top-0 z-10 grid border-b bg-background'
            data-slot='data-grid-header'
            role='rowgroup'
            style={{ minWidth: table.getTotalSize() }}
          >
            {table.getHeaderGroups().map((headerGroup, rowIndex) => (
              <div
                aria-rowindex={rowIndex + 1}
                className='flex w-full'
                data-slot='data-grid-header-row'
                key={headerGroup.id}
                role='row'
                style={{ minWidth: table.getTotalSize() }}
                tabIndex={-1}
              >
                {headerGroup.headers.map((header, columnIndex) => {
                  const sorted = header.column.getIsSorted()
                  return (
                    <div
                      aria-colindex={columnIndex + 1}
                      aria-sort={
                        sorted === 'asc'
                          ? 'ascending'
                          : sorted === 'desc'
                            ? 'descending'
                            : header.column.getCanSort()
                              ? 'none'
                              : undefined
                      }
                      className='relative flex min-h-9 items-center border-e px-1.5 text-muted-foreground last:border-e-0 data-[pinned]:bg-background'
                      data-column-id={header.column.id}
                      data-pinned={header.column.getIsPinned() || undefined}
                      data-slot='data-grid-header-cell'
                      key={header.id}
                      role='columnheader'
                      style={pinnedColumnStyle(header.column, fillColumnId)}
                      tabIndex={-1}
                    >
                      {header.isPlaceholder ? null : <DataGridColumnHeader header={header} />}
                    </div>
                  )
                })}
              </div>
            ))}
          </div>

          <div
            className='relative grid'
            data-slot='data-grid-body'
            data-virtualized={shouldVirtualize ? 'true' : undefined}
            role='rowgroup'
            style={{
              height: shouldVirtualize ? rowVirtualizer.getTotalSize() : undefined,
              minWidth: table.getTotalSize(),
            }}
          >
            {isLoading ? (
              Array.from({ length: loadingRowCount }).map((_, rowIndex) => (
                <div
                  aria-rowindex={headerRowCount + rowIndex + 1}
                  className={cn('flex w-full border-b last:border-b-0', ROW_DENSITY[density])}
                  key={`skeleton-${rowIndex}`}
                  role='row'
                  tabIndex={-1}
                >
                  {leafColumns.map((column, columnIndex) => (
                    <div
                      aria-colindex={columnIndex + 1}
                      className={cn(
                        'flex items-center border-e last:border-e-0 data-[pinned]:bg-background',
                        CELL_DENSITY[density],
                      )}
                      data-column-id={column.id}
                      data-pinned={column.getIsPinned() || undefined}
                      key={column.id}
                      role='gridcell'
                      style={pinnedColumnStyle(column, fillColumnId)}
                      tabIndex={-1}
                    >
                      <Skeleton className='h-4 w-full' />
                    </div>
                  ))}
                </div>
              ))
            ) : rows.length === 0 ? (
              <div
                aria-rowindex={headerRowCount + 1}
                className='flex min-h-24 items-center justify-center text-muted-foreground'
                role='row'
                tabIndex={-1}
              >
                <div aria-colindex={1} role='gridcell' tabIndex={-1}>
                  {emptyMessage}
                </div>
              </div>
            ) : shouldVirtualize ? (
              rowVirtualizer.getVirtualItems().flatMap((virtualRow) => {
                const row = rows[virtualRow.index]
                if (!row) return []

                return renderDataRow(row, virtualRow.index, {
                  height: virtualRow.size,
                  transform: `translateY(${virtualRow.start}px)`,
                })
              })
            ) : (
              rows.flatMap((row, rowIndex) => {
                const group = getRowGroup?.(row.original) ?? null
                const startsGroup = Boolean(group && group !== lastGroup)
                if (startsGroup) renderedGroupCount += 1
                const dataRow = renderDataRow(
                  row,
                  rowIndex,
                  undefined,
                  headerRowCount + getCollectionRowIndex(row, rowIndex) + renderedGroupCount + 1,
                )
                if (startsGroup) {
                  lastGroup = group
                  return [
                    <div
                      aria-rowindex={headerRowCount + rowIndex + renderedGroupCount}
                      className='flex min-h-9 items-center border-b bg-muted/40 px-3 font-medium'
                      data-slot='data-grid-group-row'
                      key={`group-${group}-${rowIndex}`}
                      role='row'
                      tabIndex={-1}
                    >
                      <div role='gridcell' tabIndex={-1}>
                        {group}
                      </div>
                    </div>,
                    dataRow,
                  ]
                }
                return [dataRow]
              })
            )}
          </div>

          {onRowAdd ? (
            <div
              className='sticky bottom-0 z-10 grid border-t bg-background'
              data-slot='data-grid-add-row-group'
              role='rowgroup'
            >
              <div
                aria-rowindex={ariaRowCount}
                className='flex min-h-9 w-full'
                role='row'
                style={{ minWidth: table.getTotalSize() }}
                tabIndex={-1}
              >
                <div className='flex grow items-center bg-muted/30' role='gridcell' tabIndex={-1}>
                  <Button
                    aria-label={addRowLabel}
                    className='h-full w-full justify-start rounded-none px-3 text-muted-foreground'
                    onClick={() => void onRowAdd()}
                    variant='ghost'
                  >
                    <PlusIcon />
                    {addRowLabel}
                  </Button>
                </div>
              </div>
            </div>
          ) : null}

          {footerContent ? (
            <div
              className='sticky bottom-0 z-10 border-t bg-background'
              data-slot='data-grid-footer'
            >
              {footerContent}
            </div>
          ) : null}
        </ScrollAreaPrimitive.Content>
      </ScrollAreaPrimitive.Viewport>
      <ScrollBar orientation='vertical' />
      <ScrollBar orientation='horizontal' />
      <ScrollAreaPrimitive.Corner data-slot='scroll-area-corner' />
    </ScrollAreaPrimitive.Root>
  )
}
