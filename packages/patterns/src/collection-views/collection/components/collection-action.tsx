'use client'

import { Button } from '@fifilo/ui/components/button'
import { ToolbarButton } from '@fifilo/ui/components/toolbar'
import { cn } from '@fifilo/ui/lib/utils'
import type { ReactElement } from 'react'

export interface ActionProps {
  className?: string
  disabled?: boolean
  label?: string
  onClick: () => void
  /** Why the action is refused. Only meaningful together with `disabled`. */
  title?: string
}

/**
 * Base UI's toolbar button stays focusable while disabled and, to do that,
 * drops the node's native `disabled` — so Tailwind's `disabled:` never matches,
 * and without the handling below a refused action still looks like one that
 * takes the click.
 */
export function Action({
  className,
  disabled = false,
  label = 'Adicionar',
  onClick,
  title,
}: Readonly<ActionProps>): ReactElement {
  return (
    <ToolbarButton
      disabled={disabled}
      onClick={onClick}
      render={
        <Button
          className={cn(disabled && 'cursor-not-allowed opacity-64 hover:bg-primary', className)}
          disabled={disabled}
          type='button'
          variant='default'
        />
      }
      title={title}
    >
      {label}
    </ToolbarButton>
  )
}
