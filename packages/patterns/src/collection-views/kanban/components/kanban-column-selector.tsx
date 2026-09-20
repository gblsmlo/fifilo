import { Button } from '@fifilo/ui/components/button'
import { ScrollArea } from '@fifilo/ui/components/scroll-area'
import { useId } from 'react'

import type { KanbanColumnOption } from '../types'

export interface KanbanColumnSelectorProps {
  columns: KanbanColumnOption[]
  hint?: string
  id?: string
  label?: string
  value: string
  onValueChange: (value: string) => void
}

export function KanbanColumnSelector({
  columns,
  hint,
  id,
  label = 'Coluna',
  value,
  onValueChange,
}: KanbanColumnSelectorProps) {
  const generatedId = useId()
  const selectorId = id ?? `kanban-column-${generatedId}`

  return (
    <div className='md:hidden'>
      <div className='mb-1.5 font-medium text-muted-foreground text-xs' id={`${selectorId}-label`}>
        {label}
      </div>
      <ScrollArea aria-labelledby={`${selectorId}-label`} className='h-9' scrollbarGutter>
        <div className='flex w-max gap-1'>
          {columns.map((column) => {
            const selected = column.value === value
            return (
              <Button
                aria-pressed={selected}
                key={column.value}
                onClick={() => onValueChange(column.value)}
                size='sm'
                variant={selected ? 'secondary' : 'ghost'}
              >
                {column.label}
              </Button>
            )
          })}
        </div>
      </ScrollArea>
      {hint ? <p className='mt-2 text-muted-foreground text-xs'>{hint}</p> : null}
    </div>
  )
}
