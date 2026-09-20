'use client'

import { Fragment, type ReactNode, useMemo, useState } from 'react'

import { projectCollection } from '../../collection/lib/project-collection'
import type {
  CollectionDefinition,
  CollectionGroup,
  CollectionGroupingId,
} from '../../collection/types'
import { ListGroup, type ListGroupActions } from './list-group'
import { ListItemHeadingLevelContext } from './list-item'
import { ListItemSkeleton } from './list-item-skeleton'

export interface ListViewProps<TItem> {
  collection: CollectionDefinition<TItem>
  collapsedGroupIds?: readonly string[]
  /**
   * A group with no items starts collapsed. A manual choice prevails, and a group
   * that gains items opens again on its own while nobody has touched it.
   *
   * Ignored when `collapsedGroupIds` is passed: there the array is the authority.
   */
  collapseEmptyGroups?: boolean
  defaultCollapsedGroupIds?: readonly string[]
  emptyGroupLabel?: ReactNode | ((group: CollectionGroup<TItem>) => ReactNode)
  getGroupActions?: (group: CollectionGroup<TItem>) => ListGroupActions | undefined
  /** `null` reads the collection as a flat list, with no header and no collapsing. */
  grouping: CollectionGroupingId | null
  loading?: boolean
  /** Skeletons per group — or for the whole list, when there is no grouping. */
  loadingItemCount?: number
  loadingItemLabel?: string
  onCollapsedGroupIdsChange?: (groupIds: readonly string[]) => void
  renderGroupTitle?: (group: CollectionGroup<TItem>) => ReactNode
  renderItem: (item: TItem) => ReactNode
}

export function ListView<TItem>({
  collection,
  collapsedGroupIds: controlledCollapsedGroupIds,
  collapseEmptyGroups = false,
  defaultCollapsedGroupIds = [],
  emptyGroupLabel = 'No items in this group.',
  getGroupActions,
  grouping,
  loading = false,
  loadingItemCount = 1,
  loadingItemLabel,
  onCollapsedGroupIdsChange,
  renderGroupTitle,
  renderItem,
}: ListViewProps<TItem>) {
  const [choices, setChoices] = useState<Readonly<Record<string, boolean>>>(() =>
    Object.fromEntries(defaultCollapsedGroupIds.map((groupId) => [groupId, true])),
  )
  const groups = useMemo(
    () => (grouping === null ? [] : projectCollection(collection, grouping)),
    [collection, grouping],
  )

  const resolveCollapsed = (group: CollectionGroup<TItem>, choice: boolean | undefined) =>
    choice ?? (collapseEmptyGroups && group.count === 0 && !loading)

  const isCollapsed = (group: CollectionGroup<TItem>) =>
    controlledCollapsedGroupIds
      ? controlledCollapsedGroupIds.includes(group.id)
      : resolveCollapsed(group, choices[group.id])

  const setGroupCollapsed = (groupId: string, collapsed: boolean) => {
    if (controlledCollapsedGroupIds) {
      onCollapsedGroupIdsChange?.(
        collapsed
          ? [...controlledCollapsedGroupIds.filter((id) => id !== groupId), groupId]
          : controlledCollapsedGroupIds.filter((id) => id !== groupId),
      )
      return
    }

    const nextChoices = { ...choices, [groupId]: collapsed }
    setChoices(nextChoices)
    onCollapsedGroupIdsChange?.(
      groups
        .filter((group) => resolveCollapsed(group, nextChoices[group.id]))
        .map((group) => group.id),
    )
  }

  return (
    <div
      className='flex min-w-0 flex-col gap-1 p-2 rounded-lg bg-card/40 shadow-black/5 border border-border/70'
      aria-busy={loading ? 'true' : undefined}
      data-collection-grouping={grouping ?? undefined}
      data-slot='list-view'
    >
      {grouping === null ? (
        <ListItemHeadingLevelContext.Provider value={2}>
          <div className='flex flex-col divide-y divide-border/70' data-slot='list-view-items'>
            {loading
              ? Array.from({ length: loadingItemCount }, (_, position) => (
                  <ListItemSkeleton
                    key={`loading-${position + 1}`}
                    {...(loadingItemLabel ? { label: loadingItemLabel } : {})}
                  />
                ))
              : collection.items.map((item) => (
                  <Fragment key={collection.getKey(item)}>{renderItem(item)}</Fragment>
                ))}
          </div>
        </ListItemHeadingLevelContext.Provider>
      ) : (
        groups.map((group) => {
          const actions = getGroupActions?.(group)

          return (
            <ListGroup
              collapsed={isCollapsed(group)}
              emptyLabel={
                typeof emptyGroupLabel === 'function' ? emptyGroupLabel(group) : emptyGroupLabel
              }
              getKey={collection.getKey}
              group={group}
              key={group.id}
              loading={loading}
              loadingItemCount={loadingItemCount}
              onCollapsedChange={(collapsed) => setGroupCollapsed(group.id, collapsed)}
              {...(renderGroupTitle ? { renderGroupTitle } : {})}
              renderItem={renderItem}
              {...(loadingItemLabel ? { loadingItemLabel } : {})}
              {...(actions ? { actions } : {})}
            />
          )
        })
      )}
    </div>
  )
}
