import { Badge } from '@fifilo/ui/components/badge'
import { Button } from '@fifilo/ui/components/button'
import {
  Collapsible,
  CollapsiblePanel,
  CollapsibleTrigger,
} from '@fifilo/ui/components/collapsible'
import { Empty, EmptyDescription } from '@fifilo/ui/components/empty'
import { ChevronDownIcon, ChevronRightIcon, PlusIcon } from 'lucide-react'
import { Fragment, type ReactNode, useId } from 'react'
import type { CollectionGroup } from '../../collection/types'
import { ListItemSkeleton } from './list-item-skeleton'

export interface ListGroupActions {
  addLabel?: string
  onAddItem?: (groupId: string) => void
}

export interface ListGroupProps<TItem> {
  actions?: ListGroupActions
  collapsed: boolean
  emptyLabel: ReactNode
  group: CollectionGroup<TItem>
  onCollapsedChange: (collapsed: boolean) => void
  renderItem: (item: TItem) => ReactNode
  renderGroupTitle?: (group: CollectionGroup<TItem>) => ReactNode
  getKey: (item: TItem) => string | number
  loading?: boolean
  loadingItemCount?: number
  loadingItemLabel?: string
}

export function ListGroup<TItem>({
  actions,
  collapsed,
  emptyLabel,
  getKey,
  group,
  loading = false,
  loadingItemCount = 1,
  loadingItemLabel,
  onCollapsedChange,
  renderGroupTitle,
  renderItem,
}: ListGroupProps<TItem>) {
  const instanceId = useId()
  const titleId = `list-group-title-${instanceId}`
  const groupLabel = typeof group.label === 'string' ? group.label : group.id
  const loadingItems = Array.from({ length: loadingItemCount }, (_, position) => ({
    id: `${group.id}-loading-${position + 1}`,
  }))

  return (
    <Collapsible onOpenChange={(open) => onCollapsedChange(!open)} open={!collapsed}>
      <section aria-labelledby={titleId} className='flex flex-col gap-0.5' data-slot='list-group'>
        <div
          className='flex min-h-9 items-center justify-between rounded-lg bg-card/90 px-1'
          data-slot='list-group-header'
        >
          <div className='flex min-w-0 items-center gap-1'>
            <CollapsibleTrigger
              render={
                <Button
                  aria-label={`${collapsed ? 'Expand' : 'Collapse'} ${groupLabel}`}
                  size='icon-sm'
                  variant='ghost'
                />
              }
            >
              {collapsed ? (
                <ChevronRightIcon aria-hidden='true' />
              ) : (
                <ChevronDownIcon aria-hidden='true' />
              )}
            </CollapsibleTrigger>
            {renderGroupTitle ? null : (
              <span className='flex size-5 shrink-0 items-center justify-center text-muted-foreground [&_svg]:size-4'>
                {group.icon}
              </span>
            )}
            <h2 className='truncate font-medium text-sm' id={titleId}>
              {renderGroupTitle?.(group) ?? group.label}
            </h2>
            <Badge
              className='size-5 min-w-5 shrink-0 rounded-full p-0 text-xs tabular-nums'
              data-slot='list-group-count'
              variant='secondary'
            >
              {group.count}
            </Badge>
          </div>
          {!loading && actions?.onAddItem ? (
            <Button
              aria-label={actions.addLabel ?? `Add item to ${groupLabel}`}
              onClick={() => actions.onAddItem?.(group.id)}
              size='icon-sm'
              variant='ghost'
            >
              <PlusIcon aria-hidden='true' />
            </Button>
          ) : null}
        </div>
        <CollapsiblePanel>
          <div className='flex flex-col divide-y divide-border/70' data-slot='list-group-items'>
            {loading ? (
              loadingItems.map((item) => (
                <ListItemSkeleton
                  key={item.id}
                  {...(loadingItemLabel ? { label: loadingItemLabel } : {})}
                />
              ))
            ) : group.items.length ? (
              group.items.map((item) => <Fragment key={getKey(item)}>{renderItem(item)}</Fragment>)
            ) : (
              <Empty>
                <EmptyDescription>{emptyLabel}</EmptyDescription>
              </Empty>
            )}
          </div>
        </CollapsiblePanel>
      </section>
    </Collapsible>
  )
}
