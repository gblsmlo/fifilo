'use client'

import { Button } from '@fifilo/ui/components/button'
import { MenuTrigger } from '@fifilo/ui/components/menu'
import { ToolbarButton } from '@fifilo/ui/components/toolbar'
import type { ReactElement, ReactNode } from 'react'

interface CollectionToolbarMenuTriggerProps {
  children: ReactNode
  className?: string
  disabled?: boolean
}

export function CollectionToolbarMenuTrigger({
  children,
  className,
  disabled = false,
}: Readonly<CollectionToolbarMenuTriggerProps>): ReactElement {
  return (
    <MenuTrigger
      render={
        <ToolbarButton
          render={
            <Button className={className} disabled={disabled} type='button' variant='ghost' />
          }
        />
      }
    >
      {children}
    </MenuTrigger>
  )
}
