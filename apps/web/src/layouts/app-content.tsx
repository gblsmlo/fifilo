import { cn } from '@fifilo/ui/lib/utils'
import type { ReactNode } from 'react'

interface AppContentProps {
  children: ReactNode
  className?: string
}

export function AppContent({ children, className }: Readonly<AppContentProps>) {
  return (
    <div
      className={cn(
        '@container/main flex min-h-0 flex-1 flex-col overflow-hidden px-2 pt-2 pb-3 md:px-4 md:pb-4',
        className,
      )}
      data-slot='app-content'
    >
      {children}
    </div>
  )
}
