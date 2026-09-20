import { move } from '@dnd-kit/helpers'
import type { DragEndEvent, DragOverEvent } from '@dnd-kit/react'

import type { KanbanCardMove, KanbanColumnData } from '../types'

const CARD_DRAG_PREFIX = 'kanban-card:'
const COLUMN_DROP_PREFIX = 'kanban-column:'

type DragIdentifier = string | number
type KanbanDragEvent = DragEndEvent | DragOverEvent

interface ProjectedCard<TCard> {
  card: TCard
  id: string
}

export interface CardLocation<TCard> {
  card: TCard
  cardIndex: number
  columnId: string
  columnIndex: number
}

export function createCardDragId(cardId: DragIdentifier): string {
  return `${CARD_DRAG_PREFIX}${String(cardId)}`
}

export function parseCardDragId(id: DragIdentifier): string {
  return String(id).replace(new RegExp(`^${CARD_DRAG_PREFIX}`), '')
}

export function createColumnDropId(columnId: string, instanceId?: string): string {
  const columnPart = encodeURIComponent(columnId)
  const instancePart = instanceId ? `:${encodeURIComponent(instanceId)}` : ''

  return `${COLUMN_DROP_PREFIX}${columnPart}${instancePart}`
}

export function parseColumnId(id: DragIdentifier): string {
  const value = String(id)

  if (!value.startsWith(COLUMN_DROP_PREFIX)) return ''

  const encodedColumnId = value.slice(COLUMN_DROP_PREFIX.length).split(':', 1)[0] ?? ''

  try {
    return decodeURIComponent(encodedColumnId)
  } catch {
    return encodedColumnId
  }
}

export function findCardLocation<TCard>(
  columns: KanbanColumnData<TCard>[],
  cardDragId: string,
  getCardDragId: (card: TCard) => DragIdentifier,
): CardLocation<TCard> | undefined {
  for (const [columnIndex, column] of columns.entries()) {
    const cardIndex = column.cards.findIndex((card) => String(getCardDragId(card)) === cardDragId)

    if (cardIndex !== -1) {
      const card = column.cards[cardIndex]
      if (card === undefined) continue

      return {
        card,
        cardIndex,
        columnId: column.id,
        columnIndex,
      }
    }
  }
}

/**
 * Projects the consumer's columns with dnd-kit's official `move` helper.
 * Sortable cards use the indices and groups maintained by the library. A plain
 * column target only adapts the instance-scoped droppable id to the logical
 * column id, which is the additional case required for empty lists.
 */
export function projectKanbanColumns<TCard>(
  columns: KanbanColumnData<TCard>[],
  event: KanbanDragEvent,
  getCardDragId: (card: TCard) => DragIdentifier,
): KanbanColumnData<TCard>[] {
  const target = event.operation.target
  const { columnId, type: targetType } = target?.data ?? {}
  const targetColumnId =
    targetType === 'column' && typeof columnId === 'string' ? columnId : undefined
  const collectionKeys = new Map<string, string>()
  const collections = Object.fromEntries(
    columns.map((column) => {
      const collectionKey = column.id === targetColumnId && target ? String(target.id) : column.id
      collectionKeys.set(column.id, collectionKey)

      return [
        collectionKey,
        column.cards.map((card) => ({ card, id: String(getCardDragId(card)) })),
      ]
    }),
  ) as Record<string, ProjectedCard<TCard>[]>
  const projectedCollections = move(collections, event)

  if (projectedCollections === collections) return columns

  let changed = false
  const projectedColumns = columns.map((column) => {
    const collectionKey = collectionKeys.get(column.id)
    const projectedCards = collectionKey
      ? projectedCollections[collectionKey]?.map(({ card }) => card)
      : undefined

    if (!projectedCards || hasSameCardOrder(column.cards, projectedCards, getCardDragId)) {
      return column
    }

    changed = true
    return { ...column, cards: projectedCards, count: projectedCards.length }
  })

  return changed ? projectedColumns : columns
}

export function resolveKanbanCardMove<TCard>(
  sourceColumns: KanbanColumnData<TCard>[],
  projectedColumns: KanbanColumnData<TCard>[],
  event: DragEndEvent,
  getCardDragId: (card: TCard) => DragIdentifier,
): KanbanCardMove<TCard> | undefined {
  const source = event.operation.source
  const { type: sourceType } = source?.data ?? {}

  if (event.canceled || !source || sourceType !== 'card') return undefined

  const cardDragId = String(source.id)
  const sourceLocation = findCardLocation(sourceColumns, cardDragId, getCardDragId)
  const targetLocation = findCardLocation(projectedColumns, cardDragId, getCardDragId)

  if (
    !sourceLocation ||
    !targetLocation ||
    (sourceLocation.columnId === targetLocation.columnId &&
      sourceLocation.cardIndex === targetLocation.cardIndex)
  ) {
    return undefined
  }

  return {
    card: sourceLocation.card,
    cardId: parseCardDragId(cardDragId),
    sourceColumnId: sourceLocation.columnId,
    sourceIndex: sourceLocation.cardIndex,
    targetColumnId: targetLocation.columnId,
    targetIndex: targetLocation.cardIndex,
  }
}

function hasSameCardOrder<TCard>(
  currentCards: TCard[],
  projectedCards: TCard[],
  getCardDragId: (card: TCard) => DragIdentifier,
): boolean {
  return (
    currentCards.length === projectedCards.length &&
    currentCards.every((card, index) => {
      const projectedCard = projectedCards[index]
      return (
        projectedCard !== undefined &&
        String(getCardDragId(card)) === String(getCardDragId(projectedCard))
      )
    })
  )
}
