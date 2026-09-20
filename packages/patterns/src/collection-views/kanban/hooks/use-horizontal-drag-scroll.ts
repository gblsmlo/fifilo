import { useCallback, useEffect, useRef, useState } from 'react'

const DRAG_THRESHOLD = 8
const CLICK_SUPPRESSION_WINDOW_MS = 500
const EXCLUDED_TARGETS = [
  'a',
  'button',
  'input',
  'select',
  'textarea',
  '[contenteditable="true"]',
  '[role="button"]',
  '[role="link"]',
  '[role="menuitem"]',
  '[role="option"]',
  '[role="slider"]',
  '[data-kanban-card-draggable]',
  '[data-slot="scroll-area-scrollbar"]',
].join(',')

interface DragOrigin {
  pointerId: number
  scrollLeft: number
  x: number
  y: number
  dragging: boolean
}

interface ReleasedDrag {
  at: number
  x: number
  y: number
}

function isExcludedTarget(target: EventTarget | null): boolean {
  return target instanceof Element && target.closest(EXCLUDED_TARGETS) !== null
}

export function useHorizontalDragScroll() {
  const dragOriginRef = useRef<DragOrigin | null>(null)
  const releasedDragRef = useRef<ReleasedDrag | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [rootElement, setRootElement] = useState<HTMLDivElement | null>(null)

  const resetDrag = useCallback(() => {
    dragOriginRef.current = null
    setIsDragging(false)
  }, [])

  useEffect(() => {
    const viewport = rootElement?.querySelector<HTMLDivElement>(
      '[data-slot="scroll-area-viewport"]',
    )
    if (!viewport) return

    const handlePointerDown = (event: PointerEvent) => {
      if (event.button !== 0 || !event.isPrimary || isExcludedTarget(event.target)) return

      releasedDragRef.current = null
      dragOriginRef.current = {
        dragging: false,
        pointerId: event.pointerId,
        scrollLeft: viewport.scrollLeft,
        x: event.clientX,
        y: event.clientY,
      }
    }

    const handlePointerMove = (event: PointerEvent) => {
      const origin = dragOriginRef.current
      if (!origin || origin.pointerId !== event.pointerId) return

      const deltaX = event.clientX - origin.x
      const deltaY = event.clientY - origin.y

      if (!origin.dragging) {
        if (Math.abs(deltaX) < DRAG_THRESHOLD && Math.abs(deltaY) < DRAG_THRESHOLD) return
        if (Math.abs(deltaX) <= Math.abs(deltaY)) {
          dragOriginRef.current = null
          return
        }

        origin.dragging = true
        viewport.setPointerCapture?.(event.pointerId)
        setIsDragging(true)
      }

      event.preventDefault()
      const maximumScrollLeft = Math.max(0, viewport.scrollWidth - viewport.clientWidth)
      viewport.scrollLeft = Math.min(maximumScrollLeft, Math.max(0, origin.scrollLeft - deltaX))
    }

    const handlePointerEnd = (event: PointerEvent) => {
      const origin = dragOriginRef.current
      if (!origin || origin.pointerId !== event.pointerId) return

      if (origin.dragging) {
        releasedDragRef.current = { at: Date.now(), x: event.clientX, y: event.clientY }
        if (viewport.hasPointerCapture?.(event.pointerId)) {
          viewport.releasePointerCapture(event.pointerId)
        }
      }

      resetDrag()
    }

    const handleClickCapture = (event: MouseEvent) => {
      const releasedDrag = releasedDragRef.current
      if (!releasedDrag) return

      releasedDragRef.current = null
      const isReleasedDragClick =
        Date.now() - releasedDrag.at <= CLICK_SUPPRESSION_WINDOW_MS &&
        Math.abs(event.clientX - releasedDrag.x) <= 1 &&
        Math.abs(event.clientY - releasedDrag.y) <= 1

      if (isReleasedDragClick) {
        event.preventDefault()
        event.stopPropagation()
      }
    }

    viewport.addEventListener('click', handleClickCapture, true)
    viewport.addEventListener('lostpointercapture', resetDrag)
    viewport.addEventListener('pointercancel', handlePointerEnd)
    viewport.addEventListener('pointerdown', handlePointerDown)
    viewport.addEventListener('pointermove', handlePointerMove)
    viewport.addEventListener('pointerup', handlePointerEnd)

    return () => {
      resetDrag()
      viewport.removeEventListener('click', handleClickCapture, true)
      viewport.removeEventListener('lostpointercapture', resetDrag)
      viewport.removeEventListener('pointercancel', handlePointerEnd)
      viewport.removeEventListener('pointerdown', handlePointerDown)
      viewport.removeEventListener('pointermove', handlePointerMove)
      viewport.removeEventListener('pointerup', handlePointerEnd)
    }
  }, [resetDrag, rootElement])

  return {
    isDragging,
    rootRef: setRootElement,
  }
}
