import type { DragEndEvent, DragOverEvent, DragStartEvent } from '@dnd-kit/react'
import { useCallback, useEffect, useRef, useState } from 'react'

import {
  createCardDragId,
  findCardLocation,
  projectKanbanColumns,
  resolveKanbanCardMove,
} from '../lib/drag-and-drop'
import type { KanbanCardMove, KanbanColumnData } from '../types'

interface UseKanbanDragAndDropOptions<TCard> {
  columns: KanbanColumnData<TCard>[]
  getKey: (card: TCard) => string | number
  onMoveCard?: (move: KanbanCardMove<TCard>) => boolean | Promise<boolean>
}

interface PendingCardMove {
  accepted: boolean
  cardDragId: string
  requestId: number
  targetColumnId: string
  targetIndex?: number
}

export function useKanbanDragAndDrop<TCard>({
  columns,
  getKey,
  onMoveCard,
}: UseKanbanDragAndDropOptions<TCard>) {
  const [optimisticColumns, setOptimisticColumns] = useState<KanbanColumnData<TCard>[] | null>(null)
  const [focusCardDragId, setFocusCardDragId] = useState<string | null>(null)
  const columnsRef = useRef(columns)
  const optimisticColumnsRef = useRef<KanbanColumnData<TCard>[] | null>(null)
  const dragSourceColumnsRef = useRef<KanbanColumnData<TCard>[] | null>(null)
  const rollbackSourceColumnsRef = useRef<KanbanColumnData<TCard>[] | null>(null)
  const pendingCardMoveRef = useRef<PendingCardMove | null>(null)
  const moveRequestIdRef = useRef(0)
  columnsRef.current = columns

  const getCardDragId = useCallback((card: TCard) => createCardDragId(getKey(card)), [getKey])
  const updateOptimisticColumns = useCallback((nextColumns: KanbanColumnData<TCard>[] | null) => {
    if (optimisticColumnsRef.current === nextColumns) return
    optimisticColumnsRef.current = nextColumns
    setOptimisticColumns(nextColumns)
  }, [])

  useEffect(() => {
    const rollbackSourceColumns = rollbackSourceColumnsRef.current
    if (rollbackSourceColumns && columns !== rollbackSourceColumns) {
      rollbackSourceColumnsRef.current = null
      updateOptimisticColumns(null)
      return
    }

    const pendingCardMove = pendingCardMoveRef.current
    if (!pendingCardMove?.accepted) return
    if (!isPendingCardMoveConfirmed(columns, pendingCardMove, getCardDragId)) return

    pendingCardMoveRef.current = null
    updateOptimisticColumns(null)
  }, [columns, getCardDragId, updateOptimisticColumns])

  const handleDragStart = useCallback((_event: DragStartEvent) => {
    setFocusCardDragId(null)
    dragSourceColumnsRef.current = optimisticColumnsRef.current ?? columnsRef.current
  }, [])
  const handleCardFocusRestored = useCallback(() => setFocusCardDragId(null), [])

  const handleDragOver = useCallback(
    (event: DragOverEvent) => {
      const { source, target } = event.operation
      const { type: sourceType } = source?.data ?? {}
      const { type: targetType } = target?.data ?? {}

      if (!onMoveCard || sourceType !== 'card' || targetType !== 'column') {
        return
      }

      const visibleColumns =
        optimisticColumnsRef.current ?? dragSourceColumnsRef.current ?? columnsRef.current
      const projectedColumns = projectKanbanColumns(visibleColumns, event, getCardDragId)

      if (projectedColumns !== visibleColumns) updateOptimisticColumns(projectedColumns)
    },
    [getCardDragId, onMoveCard, updateOptimisticColumns],
  )

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const sourceColumns = dragSourceColumnsRef.current ?? columnsRef.current
      dragSourceColumnsRef.current = null

      if (event.canceled) {
        if (!pendingCardMoveRef.current) updateOptimisticColumns(null)
        return
      }

      const visibleColumns = optimisticColumnsRef.current ?? sourceColumns
      const projectedColumns = projectKanbanColumns(visibleColumns, event, getCardDragId)
      const move = resolveKanbanCardMove(sourceColumns, projectedColumns, event, getCardDragId)

      if (!move || !onMoveCard) {
        if (!pendingCardMoveRef.current) updateOptimisticColumns(null)
        return
      }

      if (move.sourceColumnId !== move.targetColumnId) {
        setFocusCardDragId(String(event.operation.source?.id))
      }
      updateOptimisticColumns(projectedColumns)
      rollbackSourceColumnsRef.current = null
      const requestId = moveRequestIdRef.current + 1
      moveRequestIdRef.current = requestId
      pendingCardMoveRef.current = {
        accepted: false,
        cardDragId: String(event.operation.source?.id),
        requestId,
        targetColumnId: move.targetColumnId,
        ...(move.targetIndex === undefined ? {} : { targetIndex: move.targetIndex }),
      }
      const suspension = event.suspend()

      const settleCardMove = (accepted: boolean, settleSuspension: boolean) => {
        const pendingCardMove = pendingCardMoveRef.current
        if (!pendingCardMove || pendingCardMove.requestId !== requestId) return

        if (!accepted) {
          pendingCardMoveRef.current = null
          if (settleSuspension) suspension.abort()
          rollbackSourceColumnsRef.current = sourceColumns
          updateOptimisticColumns(cloneColumnOrder(sourceColumns))
          return
        }

        pendingCardMove.accepted = true
        if (settleSuspension) suspension.resume()
        if (!isPendingCardMoveConfirmed(columnsRef.current, pendingCardMove, getCardDragId)) return

        pendingCardMoveRef.current = null
        updateOptimisticColumns(null)
      }

      try {
        const moveAccepted = onMoveCard(move)

        if (isPromiseLike(moveAccepted)) {
          // Holding a suspended operation across network latency keeps the
          // drag feedback active after pointer-up. Finish the native drop now;
          // the optimistic columns below own cache reconciliation only.
          suspension.resume()
          void Promise.resolve(moveAccepted).then(
            (accepted) => settleCardMove(accepted, false),
            () => settleCardMove(false, false),
          )
        } else {
          settleCardMove(moveAccepted, true)
        }
      } catch {
        settleCardMove(false, true)
      }
    },
    [getCardDragId, onMoveCard, updateOptimisticColumns],
  )

  return {
    cardDragEnabled: Boolean(onMoveCard),
    focusCardDragId,
    getCardDragId,
    handleCardFocusRestored,
    handleDragEnd,
    handleDragOver,
    handleDragStart,
    visibleColumns: optimisticColumns ?? columns,
  }
}

function isPendingCardMoveConfirmed<TCard>(
  columns: KanbanColumnData<TCard>[],
  pendingCardMove: PendingCardMove,
  getCardDragId: (card: TCard) => string,
): boolean {
  const cardLocation = findCardLocation(columns, pendingCardMove.cardDragId, getCardDragId)

  return (
    cardLocation?.columnId === pendingCardMove.targetColumnId &&
    (pendingCardMove.targetIndex === undefined ||
      cardLocation.cardIndex === pendingCardMove.targetIndex)
  )
}

function isPromiseLike(value: boolean | Promise<boolean>): value is Promise<boolean> {
  return typeof value === 'object' && value !== null && 'then' in value
}

function cloneColumnOrder<TCard>(columns: KanbanColumnData<TCard>[]): KanbanColumnData<TCard>[] {
  return columns.map((column) => ({ ...column, cards: [...column.cards] }))
}
