import { type ReactNode, useMemo } from 'react'

import { DataGrid, type DataGridProps } from '../../datagrid/data-grid'
import { KanbanView, type KanbanViewProps } from '../../kanban/components/kanban-view'
import type { KanbanColumnData } from '../../kanban/types'
import { ListView, type ListViewProps } from '../../list/components/list-view'
import { projectCollection } from '../lib/project-collection'
import type { CollectionDefinition } from '../types'
import { useCollectionPreferences } from './collection-provider'

/**
 * The DataGrid receives the table the consumer assembled — columns, sorting and
 * selection are the domain's, not the collection's. The outlet only decides
 * when it enters.
 */
export type CollectionDataGridViewProps<TItem> = DataGridProps<TItem>

export type CollectionKanbanViewProps<TItem> = Omit<
  KanbanViewProps<TItem>,
  'columns' | 'getKey' | 'renderCard'
>

export type CollectionListViewProps<TItem> = Omit<
  ListViewProps<TItem>,
  'collection' | 'grouping' | 'renderItem'
>

export interface CollectionViewOutletProps<TItem> {
  collection: CollectionDefinition<TItem>
  datagrid?: CollectionDataGridViewProps<TItem>
  kanban?: CollectionKanbanViewProps<TItem>
  list?: CollectionListViewProps<TItem>
  renderKanbanItem?: (item: TItem) => ReactNode
  renderListItem?: (item: TItem) => ReactNode
}

export function CollectionViewOutlet<TItem>({
  collection,
  datagrid,
  kanban,
  list,
  renderKanbanItem,
  renderListItem,
}: CollectionViewOutletProps<TItem>) {
  const { preferences } = useCollectionPreferences()
  const columns = useMemo<KanbanColumnData<TItem>[]>(() => {
    if (preferences.view !== 'kanban') return []

    return projectCollection(collection, preferences.groupBy).map((group) => ({
      cards: [...group.items],
      count: group.count,
      id: group.id,
      title: group.label,
    }))
  }, [collection, preferences.groupBy, preferences.view])

  if (preferences.view === 'datagrid') {
    // Offering the mode in the toolbar without passing the table is a
    // programming error, of the same kind as projecting groups with no
    // dimension — not a state to degrade.
    if (!datagrid) {
      throw new Error('CollectionViewOutlet: the "datagrid" view requires the `datagrid` prop.')
    }

    return <DataGrid {...datagrid} />
  }

  if (preferences.view === 'list') {
    if (!renderListItem) {
      throw new Error('CollectionViewOutlet: the "list" view requires the `renderListItem` prop.')
    }

    return (
      <ListView
        collection={collection}
        grouping={preferences.groupBy}
        renderItem={renderListItem}
        {...list}
      />
    )
  }

  if (!renderKanbanItem) {
    throw new Error('CollectionViewOutlet: the "kanban" view requires the `renderKanbanItem` prop.')
  }

  return (
    <KanbanView
      columns={columns}
      getCardLabel={collection.getLabel}
      getKey={collection.getKey}
      renderCard={renderKanbanItem}
      {...kanban}
    />
  )
}
