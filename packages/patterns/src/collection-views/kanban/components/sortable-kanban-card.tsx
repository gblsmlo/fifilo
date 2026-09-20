import { pointerIntersection } from '@dnd-kit/collision'
import { KeyboardSensor, PointerActivationConstraints, PointerSensor } from '@dnd-kit/dom'
import { useSortable } from '@dnd-kit/react/sortable'
import { cn } from '@fifilo/ui/lib/utils'
import type {
  MouseEvent as ReactMouseEvent,
  ReactNode,
  PointerEvent as ReactPointerEvent,
} from 'react'
import { useCallback, useLayoutEffect, useRef } from 'react'

const KANBAN_CARD_SENSORS = [
  PointerSensor.configure({
    /**
     * O card inteiro e o handle de arraste. Nesse caso o padrao do dnd-kit dispara
     * o arraste ja no `pointerdown` e instala um cancelador do `click` seguinte —
     * o card para de abrir Details com o mouse, e nada abaixo de E2E enxerga isso
     * (com evento sintetico o `setPointerCapture` falha e o dnd-kit desiste).
     * Exigir deslocamento minimo separa clique de arraste; no toque mantem-se o
     * atraso, para nao competir com o scroll da coluna.
     */
    activationConstraints: (event) =>
      event.pointerType === 'touch'
        ? [new PointerActivationConstraints.Delay({ value: 250, tolerance: 5 })]
        : [new PointerActivationConstraints.Distance({ value: 5 })],
  }),
  KeyboardSensor.configure({
    keyboardCodes: {
      cancel: ['Escape'],
      down: ['ArrowDown'],
      end: ['Space', 'Tab'],
      left: ['ArrowLeft'],
      right: ['ArrowRight'],
      start: ['Space'],
      up: ['ArrowUp'],
    },
  }),
]

interface SortableKanbanCardProps {
  children: ReactNode
  columnId: string
  dragLabel: string
  id: string
  index: number
}

export function SortableKanbanCard({
  children,
  columnId,
  dragLabel,
  id,
  index,
}: SortableKanbanCardProps) {
  const { handleRef, isDragSource, ref } = useSortable({
    accept: 'kanban-card',
    collisionDetector: pointerIntersection,
    data: { cardId: id, columnId, type: 'card' },
    group: columnId,
    id,
    index,
    sensors: KANBAN_CARD_SENSORS,
    transition: null,
    type: 'kanban-card',
  })
  const wrapperRef = useRef<HTMLElement | null>(null)
  const pointerMovedRef = useRef(false)
  const setWrapperRef = useCallback(
    (node: HTMLElement | null) => {
      wrapperRef.current = node
      ref(node)
    },
    [ref],
  )

  useLayoutEffect(() => {
    const wrapper = wrapperRef.current
    handleRef(wrapper)
    return () => handleRef(null)
  })

  const handlePointerDownCapture = (event: ReactPointerEvent<HTMLElement>) => {
    pointerMovedRef.current = false
    const target = event.target
    if (target instanceof Element && target.closest('[data-kanban-card-action]')) {
      event.stopPropagation()
    }
  }
  const handlePointerMoveCapture = (event: ReactPointerEvent<HTMLElement>) => {
    if (event.buttons !== 0) pointerMovedRef.current = true
  }
  const handleClickCapture = (event: ReactMouseEvent<HTMLElement>) => {
    if (!pointerMovedRef.current) return
    pointerMovedRef.current = false
    event.preventDefault()
    event.stopPropagation()
  }

  return (
    <section
      aria-label={dragLabel}
      className={cn(
        'relative min-w-0 max-w-full touch-none rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-ring',
        'cursor-grab active:cursor-grabbing',
        isDragSource && 'opacity-0',
      )}
      data-kanban-card-container=''
      data-kanban-card-drag-id={id}
      data-kanban-card-draggable=''
      onClickCapture={handleClickCapture}
      onPointerDownCapture={handlePointerDownCapture}
      onPointerMoveCapture={handlePointerMoveCapture}
      ref={setWrapperRef}
    >
      {children}
    </section>
  )
}
