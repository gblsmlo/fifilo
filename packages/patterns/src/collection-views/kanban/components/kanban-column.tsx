import { CollisionPriority } from '@dnd-kit/abstract'
import { useDroppable } from '@dnd-kit/react'
import { Button } from '@fifilo/ui/components/button'
import { ScrollArea } from '@fifilo/ui/components/scroll-area'
import { cn } from '@fifilo/ui/lib/utils'
import { EllipsisIcon, PlusIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { useId } from 'react'

import { createColumnDropId } from '../lib/drag-and-drop'
import type { KanbanColumnActions, KanbanColumnData } from '../types'
import { KanbanBadge } from './kanban-badge'
import { KanbanCardSkeleton } from './kanban-card-skeleton'
import { SortableKanbanCard } from './sortable-kanban-card'

export interface KanbanColumnProps<TCard = unknown> {
  column: KanbanColumnData<TCard>
  renderCard: (card: TCard) => ReactNode
  getKey: (card: TCard) => string | number
  emptyLabel?: string
  className?: string
  getCardDragId?: (card: TCard) => string
  getCardLabel?: (card: TCard) => string
  loading?: boolean
  loadingCardCount?: number
  loadingCardLabel?: string
  renderColumnTitle?: (column: KanbanColumnData<TCard>) => ReactNode
  sortableCards?: boolean
  actions?: KanbanColumnActions
}

function KanbanEmptyState({
  children,
  className,
}: Readonly<{ children: ReactNode; className?: string }>) {
  return (
    <div
      className={cn(
        'min-w-0 max-w-full rounded-md border border-dashed px-3 py-6 text-center text-muted-foreground text-sm',
        className,
      )}
    >
      {children}
    </div>
  )
}

function KanbanColumnHeader<TCard>({
  actions,
  column,
  renderColumnTitle,
  titleId,
}: Readonly<{
  actions?: KanbanColumnActions
  column: KanbanColumnData<TCard>
  renderColumnTitle?: (column: KanbanColumnData<TCard>) => ReactNode
  titleId: string
}>) {
  return (
    <header className='mb-3 flex shrink-0 items-center justify-between gap-3 px-3 pt-3'>
      <div className='flex min-w-0 items-center gap-2'>
        <h2 className='truncate font-semibold text-sm leading-none' id={titleId}>
          {renderColumnTitle?.(column) ?? column.title}
        </h2>
        <KanbanBadge tone='neutral'>{column.count}</KanbanBadge>
      </div>
      {actions?.onOpenSettings || actions?.onAddCard ? (
        <div className='flex shrink-0 items-center gap-0.5'>
          {actions.onOpenSettings ? (
            <Button
              aria-label={actions.settingsLabel ?? `Configurar seção ${column.title}`}
              onClick={() => actions.onOpenSettings?.(column.id)}
              size='icon-sm'
              variant='ghost'
            >
              <EllipsisIcon aria-hidden='true' />
            </Button>
          ) : null}
          {actions.onAddCard ? (
            <Button
              aria-label={actions.addLabel ?? `Adicionar item à seção ${column.title}`}
              onClick={() => actions.onAddCard?.(column.id)}
              size='icon-sm'
              variant='ghost'
            >
              <PlusIcon aria-hidden='true' />
            </Button>
          ) : null}
        </div>
      ) : null}
    </header>
  )
}

interface KanbanColumnCardsProps<TCard> {
  column: KanbanColumnData<TCard>
  emptyLabel: string
  getCardDragId?: (card: TCard) => string
  getCardLabel: (card: TCard) => string
  getKey: (card: TCard) => string | number
  loading: boolean
  loadingCardCount: number
  loadingCardLabel?: string
  renderCard: (card: TCard) => ReactNode
  sortableCards: boolean
}

function KanbanColumnCards<TCard>({
  column,
  emptyLabel,
  getCardDragId,
  getCardLabel,
  getKey,
  loading,
  loadingCardCount,
  loadingCardLabel,
  renderCard,
  sortableCards,
}: KanbanColumnCardsProps<TCard>) {
  if (loading) {
    const loadingCards = Array.from({ length: loadingCardCount }, (_, position) => ({
      id: `${column.id}-loading-${position + 1}`,
    }))

    return loadingCards.map((card) => (
      <KanbanCardSkeleton
        key={card.id}
        {...(loadingCardLabel ? { label: loadingCardLabel } : {})}
      />
    ))
  }

  if (!column.cards.length) {
    return <KanbanEmptyState className='bg-card/60 py-10'>{emptyLabel}</KanbanEmptyState>
  }

  if (!sortableCards || !getCardDragId) {
    return column.cards.map((card) => (
      <div className='min-w-0 max-w-full' data-kanban-card-container='' key={getKey(card)}>
        {renderCard(card)}
      </div>
    ))
  }

  return column.cards.map((card, index) => (
    <SortableKanbanCard
      columnId={column.id}
      dragLabel={`Mover card ${getCardLabel(card)}`}
      id={getCardDragId(card)}
      index={index}
      key={getKey(card)}
    >
      {renderCard(card)}
    </SortableKanbanCard>
  ))
}

export function KanbanColumn<TCard>({
  column,
  renderCard,
  getKey,
  emptyLabel = 'Nenhum item nesta coluna.',
  className,
  getCardDragId,
  getCardLabel = (card) => String(getKey(card)),
  loading = false,
  loadingCardCount = 1,
  loadingCardLabel,
  renderColumnTitle,
  sortableCards = false,
  actions,
}: KanbanColumnProps<TCard>) {
  const instanceId = useId()
  const titleId = `kanban-column-title-${instanceId}`
  const { ref } = useDroppable({
    accept: 'kanban-card',
    collisionPriority: CollisionPriority.Lowest,
    id: createColumnDropId(column.id, instanceId),
    data: { columnId: column.id, type: 'column' },
    disabled: !sortableCards,
    type: 'kanban-column',
  })

  return (
    <section
      aria-labelledby={titleId}
      className={cn(
        'flex h-full min-h-0 min-w-0 max-w-full flex-col rounded-lg bg-card/40 shadow-black/5 shadow-inner',
        className,
      )}
    >
      <KanbanColumnHeader
        column={column}
        titleId={titleId}
        {...(!loading && actions ? { actions } : {})}
        {...(renderColumnTitle ? { renderColumnTitle } : {})}
      />

      <ScrollArea className='min-h-0 flex-1' fill scrollbarGutter scrollFade>
        <div
          ref={ref}
          className='grid h-full min-h-full min-w-0 max-w-full content-start gap-2 px-2 pb-2'
        >
          <KanbanColumnCards
            column={column}
            emptyLabel={emptyLabel}
            getCardLabel={getCardLabel}
            getKey={getKey}
            loading={loading}
            loadingCardCount={loadingCardCount}
            renderCard={renderCard}
            sortableCards={sortableCards}
            {...(getCardDragId ? { getCardDragId } : {})}
            {...(loadingCardLabel ? { loadingCardLabel } : {})}
          />
        </div>
      </ScrollArea>
    </section>
  )
}
