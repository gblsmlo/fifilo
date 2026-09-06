import { Loader2Icon } from 'lucide-react'
import type React from 'react'
import { cn } from '../lib/utils'

/**
 * Decorative. Whoever renders it already exposes the state another way: the
 * Button through `disabled`, the state surface through its `aria-live` region.
 * Announcing the icon on top of that stole the button's accessible name, which
 * became "Entrar Loading".
 */
export function Spinner({
  className,
  ...props
}: React.ComponentProps<typeof Loader2Icon>): React.ReactElement {
  return (
    <Loader2Icon
      aria-hidden='true'
      className={cn('animate-spin', className)}
      data-slot='spinner'
      {...props}
    />
  )
}
