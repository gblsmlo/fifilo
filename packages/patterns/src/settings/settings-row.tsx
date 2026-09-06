'use client'

import { Text } from '@fifilo/ui/components/text'
import { cn } from '@fifilo/ui/lib/utils'
import type { ComponentPropsWithoutRef, ReactNode } from 'react'

export interface SettingsRowProps extends Omit<ComponentPropsWithoutRef<'div'>, 'title'> {
  description?: ReactNode
  title: ReactNode
}

export function SettingsRow({
  children,
  className,
  description,
  title,
  ...props
}: Readonly<SettingsRowProps>) {
  return (
    <div
      className={cn('flex items-center justify-between gap-6 py-3', className)}
      data-slot='settings-row'
      {...props}
    >
      <div className='min-w-0' data-slot='settings-row-heading'>
        <Text render={<p data-slot='settings-row-title'>{title}</p>} size='sm' weight='semibold' />
        {description ? (
          <Text
            foreground='muted'
            render={<p data-slot='settings-row-description'>{description}</p>}
            size='sm'
          />
        ) : null}
      </div>
      {children ? (
        <div className='flex gap-2 shrink-0 items-center' data-slot='settings-row-trailing'>
          {children}
        </div>
      ) : null}
    </div>
  )
}
