export interface KanbanColumnData<TCard = unknown> {
  id: string
  title: string
  count: number
  cards: TCard[]
}

export interface KanbanColumnActions {
  /** Accessible label for the add action. Defaults to a label containing the column title. */
  addLabel?: string
  /** Accessible label for the settings action. Defaults to a label containing the column title. */
  settingsLabel?: string
  onAddCard?: (columnId: string) => void
  onOpenSettings?: (columnId: string) => void
}

export interface KanbanCardMove<TCard = unknown> {
  card: TCard
  cardId: string
  /** Column containing the card when the interaction started. */
  sourceColumnId: string
  /** Original zero-based position in the source column. */
  sourceIndex?: number
  /** Destination column; equal to sourceColumnId for an in-column reorder. */
  targetColumnId: string
  /** Requested zero-based position for consumer-owned persistence. */
  targetIndex?: number
}

export interface KanbanColumnOption {
  label: string
  value: string
}
