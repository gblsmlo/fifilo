import { Badge } from '@fifilo/ui/components/badge'
import type { ReactNode } from 'react'

export interface KanbanBadgeProps {
  children: ReactNode
  className?: string
  tone?: 'muted' | 'neutral' | 'primary'
}

export function KanbanBadge({ children, className, tone: _tone = 'neutral' }: KanbanBadgeProps) {
  return (
    <Badge className={className} variant='secondary'>
      {children}
    </Badge>
  )
}
