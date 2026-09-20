'use client'

import { Input } from '@fifilo/ui/components/input'
import { ToolbarInput } from '@fifilo/ui/components/toolbar'
import { cn } from '@fifilo/ui/lib/utils'
import { SearchIcon } from 'lucide-react'
import { type FormEvent, type ReactElement, useEffect, useState } from 'react'

export interface CollectionSearchFieldProps {
  className?: string
  label?: string
  /**
   * Called on submit and on clearing, never on every keystroke: the consumer
   * writes the value into the URL, and writing per keystroke stacks one history
   * entry per typed letter.
   */
  onCommit: (value: string) => void
  placeholder?: string
  /** The value already confirmed. The draft up to the submit is local. */
  value?: string
}

/**
 * Collection search, left of the toolbar. It composes inside `CollectionToolbar`:
 * the field registers itself in the toolbar's roving focus and does not mount
 * outside it.
 *
 * The draft is local state because it has not been written anywhere yet — it is
 * not a copy of the confirmed value, and therefore does not compete with it.
 * When the confirmed value changes from the outside (back button, shared link),
 * the draft follows it.
 */
export function CollectionSearchField({
  className,
  label = 'Buscar',
  onCommit,
  placeholder = 'Buscar',
  value = '',
}: Readonly<CollectionSearchFieldProps>): ReactElement {
  const [draft, setDraft] = useState(value)
  useEffect(() => setDraft(value), [value])

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    onCommit(draft.trim())
  }

  return (
    <form className={cn('relative', className)} onSubmit={submit}>
      <SearchIcon
        aria-hidden='true'
        className='pointer-events-none absolute top-1/2 left-2.5 z-1 size-4 -translate-y-1/2 text-muted-foreground'
      />
      <ToolbarInput
        render={
          // The inset goes on the Input wrapper, not on the field: only the
          // wrapper takes a class, and it is the one opening room for the glass.
          <Input
            aria-label={label}
            className='w-56 ps-6 sm:w-64'
            nativeInput
            onChange={(event) => {
              setDraft(event.target.value)
              if (event.target.value === '') onCommit('')
            }}
            placeholder={placeholder}
            type='search'
            value={draft}
          />
        }
      />
    </form>
  )
}
