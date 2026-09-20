import { useEffect, useState } from 'react'

import type { KanbanColumnData } from '../types'

export function useActiveColumnId(columns: KanbanColumnData[]): [string, (id: string) => void] {
  const [activeColumnId, setActiveColumnId] = useState(columns[0]?.id ?? '')

  useEffect(() => {
    if (!columns.some((column) => column.id === activeColumnId)) {
      setActiveColumnId(columns[0]?.id ?? '')
    }
  }, [activeColumnId, columns])

  return [activeColumnId, setActiveColumnId]
}
