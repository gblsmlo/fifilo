import { DragDropProvider, DragOverlay } from '@dnd-kit/react'
import { ScrollArea } from '@fifilo/ui/components/scroll-area'
import { cn } from '@fifilo/ui/lib/utils'
import type { ReactNode } from 'react'
import { useLayoutEffect, useMemo, useRef } from 'react'

import { useActiveColumnId } from '../hooks/use-active-column-id'
import { useHorizontalDragScroll } from '../hooks/use-horizontal-drag-scroll'
import { useKanbanDragAndDrop } from '../hooks/use-kanban-drag-and-drop'
import type {
  KanbanCardMove,
  KanbanColumnActions,
  KanbanColumnData,
  KanbanColumnOption,
} from '../types'
import { KanbanColumn } from './kanban-column'
import { KanbanColumnSelector } from './kanban-column-selector'

export interface KanbanViewProps<TCard = unknown> {
  columns: KanbanColumnData<TCard>[]
  renderCard: (card: TCard) => ReactNode
  getKey: (card: TCard) => string | number
  getCardLabel?: (card: TCard) => string
  getColumnActions?: (column: KanbanColumnData<TCard>) => KanbanColumnActions | undefined
  emptyColumnLabel?: string
  loading?: boolean
  loadingCardCount?: number
  loadingCardLabel?: string
  mobileColumnHint?: string
  onMoveCard?: (move: KanbanCardMove<TCard>) => boolean | Promise<boolean>
  renderColumnTitle?: (column: KanbanColumnData<TCard>) => ReactNode
}

export function KanbanView<TCard>({
  columns,
  renderCard,
  getKey,
  getCardLabel,
  getColumnActions,
  emptyColumnLabel,
  loading = false,
  loadingCardCount = 1,
  loadingCardLabel,
  mobileColumnHint,
  onMoveCard,
  renderColumnTitle,
}: KanbanViewProps<TCard>) {
  const [activeColumnId, setActiveColumnId] = useActiveColumnId(columns)
  const {
    cardDragEnabled,
    focusCardDragId,
    getCardDragId,
    handleCardFocusRestored,
    handleDragEnd,
    handleDragOver,
    handleDragStart,
    visibleColumns,
  } = useKanbanDragAndDrop({
    columns,
    getKey,
    ...(!loading && onMoveCard ? { onMoveCard } : {}),
  })
  const { isDragging: isBoardDragging, rootRef } = useHorizontalDragScroll()
  const boardContentRef = useRef<HTMLDivElement | null>(null)
  const columnOptions = useMemo(() => createColumnOptions(columns), [columns])
  const cardsByDragId = useMemo(
    () =>
      new Map(
        visibleColumns.flatMap((column) =>
          column.cards.map((card) => [getCardDragId(card), card] as const),
        ),
      ),
    [getCardDragId, visibleColumns],
  )
  const activeColumn = useMemo(
    () => visibleColumns.find((column) => column.id === activeColumnId) ?? visibleColumns[0],
    [activeColumnId, visibleColumns],
  )
  const columnProps = {
    getCardDragId,
    getKey,
    loading,
    loadingCardCount,
    loadingCardLabel,
    renderColumnTitle,
    renderCard,
    sortableCards: cardDragEnabled,
    ...(emptyColumnLabel ? { emptyLabel: emptyColumnLabel } : {}),
    ...(getCardLabel ? { getCardLabel } : {}),
  }
  const showHorizontalScrollbar = cardDragEnabled && isBoardDragging
  const getColumnActionProps = (column: KanbanColumnData<TCard>) => {
    const actions = getColumnActions?.(column)
    return actions ? { actions } : {}
  }

  useLayoutEffect(() => {
    if (!focusCardDragId) return

    const frame = requestAnimationFrame(() => {
      const card = Array.from(
        boardContentRef.current?.querySelectorAll<HTMLElement>('[data-kanban-card-drag-id]') ?? [],
      ).find((element) => element.getAttribute('data-kanban-card-drag-id') === focusCardDragId)

      if (!card) return
      card.focus({ preventScroll: true })
      card.scrollIntoView({ behavior: 'instant', block: 'nearest', inline: 'nearest' })
      handleCardFocusRestored()
    })

    return () => cancelAnimationFrame(frame)
  }, [focusCardDragId, handleCardFocusRestored])

  return (
    <div
      aria-busy={loading ? 'true' : undefined}
      className='h-full min-h-0'
      data-slot='kanban-view'
    >
      <DragDropProvider
        onDragEnd={handleDragEnd}
        onDragOver={handleDragOver}
        onDragStart={handleDragStart}
      >
        <div className='flex h-full min-h-0 flex-col gap-2'>
          <KanbanColumnSelector
            columns={columnOptions}
            onValueChange={setActiveColumnId}
            value={activeColumnId}
            {...(mobileColumnHint ? { hint: mobileColumnHint } : {})}
          />

          <div className='grid min-h-0 flex-1 gap-2 md:hidden'>
            {activeColumn ? (
              <KanbanColumn
                column={activeColumn}
                {...columnProps}
                sortableCards={false}
                {...getColumnActionProps(activeColumn)}
              />
            ) : null}
          </div>

          <ScrollArea
            className={cn(
              'hidden min-h-0 flex-1 md:block',
              '[&_[data-orientation=horizontal][data-slot=scroll-area-scrollbar]]:!delay-0',
              showHorizontalScrollbar
                ? '[&_[data-orientation=horizontal][data-slot=scroll-area-scrollbar]]:!opacity-100'
                : '[&_[data-orientation=horizontal][data-slot=scroll-area-scrollbar]]:!pointer-events-none [&_[data-orientation=horizontal][data-slot=scroll-area-scrollbar]]:!opacity-0',
              cardDragEnabled
                ? '[&_[data-slot=scroll-area-viewport]]:cursor-grab [&_[data-slot=scroll-area-viewport]]:select-none'
                : '[&_[data-slot=scroll-area-viewport]]:cursor-default',
              showHorizontalScrollbar && '[&_[data-slot=scroll-area-viewport]]:cursor-grabbing',
            )}
            data-kanban-board-scroll-area=''
            data-kanban-horizontal-scrollbar={showHorizontalScrollbar ? 'visible' : 'hidden'}
            fill
            ref={cardDragEnabled ? rootRef : undefined}
            scrollbarGutter
            scrollFade
          >
            <div
              className='grid h-full min-h-full w-max auto-cols-[minmax(19rem,22rem)] grid-flow-col gap-2'
              ref={boardContentRef}
            >
              {visibleColumns.map((column) => (
                <KanbanColumn
                  column={column}
                  key={column.id}
                  {...columnProps}
                  {...getColumnActionProps(column)}
                />
              ))}
            </div>
          </ScrollArea>
        </div>
        <DragOverlay className='pointer-events-none' dropAnimation={null}>
          {(source) => {
            const card = cardsByDragId.get(String(source.id))
            return card ? renderCard(card) : null
          }}
        </DragOverlay>
      </DragDropProvider>
    </div>
  )
}

function createColumnOptions(columns: KanbanColumnData[]): KanbanColumnOption[] {
  return columns.map((column) => ({
    label: `${column.title} · ${column.count}`,
    value: column.id,
  }))
}
