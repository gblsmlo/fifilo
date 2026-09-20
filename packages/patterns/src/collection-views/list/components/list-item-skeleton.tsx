import { Skeleton } from '@fifilo/ui/components/skeleton'
import type { ReactElement } from 'react'
import { ListItem, ListItemBody, ListItemLeading, ListItemTrailing } from './list-item'

export interface ListItemSkeletonProps {
  label?: string
}

export function ListItemSkeleton({ label = 'Loading item' }: ListItemSkeletonProps): ReactElement {
  return (
    <ListItem aria-busy='true' aria-label={label} role='status'>
      <ListItemLeading aria-hidden='true'>
        <Skeleton className='size-4 rounded-sm' />
      </ListItemLeading>
      <ListItemBody aria-hidden='true'>
        <Skeleton className='h-4 w-1/3' />
        <Skeleton className='h-3 w-1/2' />
      </ListItemBody>
      <ListItemTrailing aria-hidden='true'>
        <div className='hidden items-center gap-2 md:flex'>
          <Skeleton className='h-6 w-20 rounded-full' />
          <Skeleton className='h-6 w-16 rounded-full' />
          <Skeleton className='h-6 w-24 rounded-full' />
          <Skeleton className='h-6 w-10 rounded-md' />
          <Skeleton className='size-6 rounded-full' />
        </div>
        <Skeleton className='size-7 rounded-md' />
      </ListItemTrailing>
    </ListItem>
  )
}
