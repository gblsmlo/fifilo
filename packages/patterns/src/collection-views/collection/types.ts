import type { ReactNode } from 'react'

export type CollectionGroupingId = string
export type CollectionViewMode = 'datagrid' | 'kanban' | 'list'

export interface CollectionOption {
  icon?: ReactNode
  id: string
  label: string
}

export interface CollectionGroupingDimension<TItem = unknown> {
  getGroupId: (item: TItem) => string | null
  id: CollectionGroupingId
  label: string
  options: readonly CollectionOption[]
  /** Label for items whose getGroupId returns null. Defaults to a generic "unassigned". */
  unassignedLabel?: string
}

export interface CollectionDefinition<TItem = unknown> {
  getKey: (item: TItem) => string | number
  getLabel: (item: TItem) => string
  groupings: readonly CollectionGroupingDimension<TItem>[]
  items: readonly TItem[]
}

export interface CollectionPreferences {
  /** `null` is the ungrouped collection, which the list and datagrid views render flat. */
  groupBy: CollectionGroupingId | null
  view: CollectionViewMode
}

export type CollectionPreferencesChangeReason = 'grouping' | 'view'

export interface CollectionPreferencesChangeDetails {
  reason: CollectionPreferencesChangeReason
}

export interface CollectionGroup<TItem = unknown> extends CollectionOption {
  count: number
  grouping: CollectionGroupingId
  items: readonly TItem[]
  value: string | null
}
