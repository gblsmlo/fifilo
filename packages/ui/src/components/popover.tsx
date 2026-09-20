'use client'

import { Popover as PopoverPrimitive } from '@base-ui/react/popover'
import type React from 'react'
import { cn } from '../lib/utils'

export const PopoverCreateHandle: typeof PopoverPrimitive.createHandle =
  PopoverPrimitive.createHandle

export const Popover: typeof PopoverPrimitive.Root = PopoverPrimitive.Root

export function PopoverTrigger({
  className,
  children,
  ...props
}: PopoverPrimitive.Trigger.Props): React.ReactElement {
  return (
    <PopoverPrimitive.Trigger className={className} data-slot='popover-trigger' {...props}>
      {children}
    </PopoverPrimitive.Trigger>
  )
}

const viewportClassName = 'relative size-full overflow-clip'

// Without the Viewport the positioner follows the content, and a ceiling in
// `--available-height` would feed back into Floating UI: shifting changes the
// available height, which changes the popup height, which shifts it again. The
// ceiling is the window, which does not depend on where the popup landed.
const plainViewportClassName = 'max-h-[calc(100dvh-1rem)] overflow-y-auto'

const transitionViewportClassName =
  'data-instant:transition-none **:data-current:data-ending-style:opacity-0 **:data-current:data-starting-style:opacity-0 **:data-previous:data-ending-style:opacity-0 **:data-previous:data-starting-style:opacity-0 **:data-current:w-[calc(var(--popup-width)-2*var(--viewport-inline-padding)-2px)] **:data-previous:w-[calc(var(--popup-width)-2*var(--viewport-inline-padding)-2px)] **:data-current:opacity-100 **:data-previous:opacity-100 **:data-current:transition-opacity **:data-previous:transition-opacity'

function viewportPaddingClassName(tooltipStyle: boolean): string {
  return tooltipStyle
    ? 'px-(--viewport-inline-padding) py-1 [--viewport-inline-padding:--spacing(2)]'
    : 'px-(--viewport-inline-padding) py-4 [--viewport-inline-padding:--spacing(4)] has-data-[slot=calendar]:p-2'
}

export function PopoverPopup({
  children,
  className,
  side = 'bottom',
  align = 'center',
  sideOffset = 4,
  alignOffset = 0,
  tooltipStyle = false,
  anchor,
  collisionAvoidance,
  portalProps,
  viewport = true,
  ...props
}: PopoverPrimitive.Popup.Props & {
  portalProps?: PopoverPrimitive.Portal.Props
  side?: PopoverPrimitive.Positioner.Props['side']
  align?: PopoverPrimitive.Positioner.Props['align']
  sideOffset?: PopoverPrimitive.Positioner.Props['sideOffset']
  alignOffset?: PopoverPrimitive.Positioner.Props['alignOffset']
  tooltipStyle?: boolean
  anchor?: PopoverPrimitive.Positioner.Props['anchor']
  collisionAvoidance?: PopoverPrimitive.Positioner.Props['collisionAvoidance']
  /**
   * Base UI's `Viewport` measures the popup once per opening and locks the
   * positioner to that size, so content can cross-fade between triggers. A
   * popup whose content grows after opening stays clipped and never
   * repositions; `false` drops that layer and lets Floating UI see the real
   * size again.
   */
  viewport?: boolean
}): React.ReactElement {
  return (
    <PopoverPrimitive.Portal {...portalProps}>
      <PopoverPrimitive.Positioner
        align={align}
        alignOffset={alignOffset}
        anchor={anchor}
        collisionAvoidance={collisionAvoidance}
        className='z-50 h-(--positioner-height) w-(--positioner-width) max-w-(--available-width) transition-[top,left,right,bottom,transform] data-instant:transition-none'
        data-slot='popover-positioner'
        side={side}
        sideOffset={sideOffset}
      >
        <PopoverPrimitive.Popup
          className={cn(
            'relative flex h-(--popup-height,auto) w-(--popup-width,auto) origin-(--transform-origin) rounded-lg border bg-popover not-dark:bg-clip-padding text-popover-foreground shadow-lg/5 outline-none transition-[width,height,scale,opacity] before:pointer-events-none before:absolute before:inset-0 before:rounded-[calc(var(--radius-lg)-1px)] before:shadow-[0_1px_--theme(--color-black/4%)] has-data-[slot=calendar]:rounded-xl has-data-[slot=calendar]:before:rounded-[calc(var(--radius-xl)-1px)] data-starting-style:scale-98 data-starting-style:opacity-0 dark:before:shadow-[0_-1px_--theme(--color-white/6%)]',
            tooltipStyle &&
              'w-fit text-balance rounded-md text-xs shadow-md/5 before:rounded-[calc(var(--radius-md)-1px)]',
            className,
          )}
          data-slot='popover-popup'
          {...props}
        >
          {viewport ? (
            <PopoverPrimitive.Viewport
              className={cn(
                viewportClassName,
                'max-h-(--available-height)',
                transitionViewportClassName,
                viewportPaddingClassName(tooltipStyle),
                !tooltipStyle && 'not-data-transitioning:overflow-y-auto',
              )}
              data-slot='popover-viewport'
            >
              {children}
            </PopoverPrimitive.Viewport>
          ) : (
            <div
              className={cn(
                viewportClassName,
                plainViewportClassName,
                viewportPaddingClassName(tooltipStyle),
              )}
              data-slot='popover-viewport'
            >
              {children}
            </div>
          )}
        </PopoverPrimitive.Popup>
      </PopoverPrimitive.Positioner>
    </PopoverPrimitive.Portal>
  )
}

export function PopoverClose({ ...props }: PopoverPrimitive.Close.Props): React.ReactElement {
  return <PopoverPrimitive.Close data-slot='popover-close' {...props} />
}

export function PopoverTitle({
  className,
  ...props
}: PopoverPrimitive.Title.Props): React.ReactElement {
  return (
    <PopoverPrimitive.Title
      className={cn('font-semibold text-lg leading-none', className)}
      data-slot='popover-title'
      {...props}
    />
  )
}

export function PopoverDescription({
  className,
  ...props
}: PopoverPrimitive.Description.Props): React.ReactElement {
  return (
    <PopoverPrimitive.Description
      className={cn('text-muted-foreground text-sm', className)}
      data-slot='popover-description'
      {...props}
    />
  )
}

export { PopoverPopup as PopoverContent, PopoverPrimitive }
