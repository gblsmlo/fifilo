'use client'

import { Button } from '@fifilo/ui/components/button'
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@fifilo/ui/components/empty'
import { Spinner } from '@fifilo/ui/components/spinner'
import { cn } from '@fifilo/ui/lib/utils'
import {
  AlertTriangleIcon,
  InboxIcon,
  LockIcon,
  RefreshCwIcon,
  SearchXIcon,
  WifiOffIcon,
} from 'lucide-react'
import { Fragment, type ReactNode } from 'react'
import type { StateSurfaceKind, SurfaceGuardState } from './state-kinds'

export type { StateSurfaceKind, SurfaceGuardState } from './state-kinds'

export interface StateSurfaceAction {
  label: string
  onPress: () => void
}

export interface StateSurfaceProps {
  actions?: StateSurfaceAction[]
  className?: string
  description: string
  kind: StateSurfaceKind
  title: string
}

interface KindConfig {
  icon: typeof InboxIcon
  role: 'status' | 'alert'
  tone: string
}

const KIND_CONFIG: Record<StateSurfaceKind, KindConfig> = {
  empty: { icon: InboxIcon, role: 'status', tone: 'text-muted-foreground' },
  error: { icon: AlertTriangleIcon, role: 'alert', tone: 'text-destructive' },
  'integration-disconnected': { icon: WifiOffIcon, role: 'alert', tone: 'text-amber-500' },
  'no-result': { icon: SearchXIcon, role: 'status', tone: 'text-muted-foreground' },
  permission: { icon: LockIcon, role: 'alert', tone: 'text-destructive' },
  'sync-pending': { icon: RefreshCwIcon, role: 'status', tone: 'text-muted-foreground' },
}

export function StateSurface({
  actions,
  className,
  description,
  kind,
  title,
}: StateSurfaceProps): ReactNode {
  const { icon: Icon, role, tone } = KIND_CONFIG[kind]

  return (
    <Empty
      aria-live={role === 'alert' ? 'assertive' : 'polite'}
      className={cn('gap-3 rounded-lg border border-dashed px-6 py-8 md:py-8', className)}
      data-kind={kind}
      role={role}
    >
      <EmptyHeader>
        <EmptyMedia className='mb-3'>
          <Icon aria-hidden='true' className={cn('size-7', tone)} />
        </EmptyMedia>
        <EmptyTitle className='font-medium font-sans text-sm'>{title}</EmptyTitle>
        <EmptyDescription>{description}</EmptyDescription>
      </EmptyHeader>
      {actions && actions.length > 0 ? (
        <EmptyContent className='flex-row flex-wrap justify-center gap-2'>
          {actions.map((action) => (
            <Button key={action.label} onClick={action.onPress} size='sm' variant='secondary'>
              {action.label}
            </Button>
          ))}
        </EmptyContent>
      ) : null}
    </Empty>
  )
}

export interface StateGuardProps {
  children: ReactNode
  state: SurfaceGuardState
  surface: Omit<StateSurfaceProps, 'kind'>
}

export function StateGuard({ children, state, surface }: StateGuardProps): ReactNode {
  if (state === 'data') {
    return <Fragment>{children}</Fragment>
  }
  if (state === 'loading') {
    return (
      <div
        aria-live='polite'
        className={cn(
          'flex flex-col items-center justify-center gap-2 p-8 text-center',
          surface.className,
        )}
        role='status'
      >
        <Spinner className='size-5 text-muted-foreground' />
        <p className='font-medium text-sm'>{surface.title}</p>
        <p className='max-w-md text-muted-foreground text-sm'>{surface.description}</p>
      </div>
    )
  }

  return <StateSurface kind={state} {...surface} />
}
