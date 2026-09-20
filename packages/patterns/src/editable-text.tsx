'use client'

import { cn } from '@fifilo/ui/lib/utils'
import { type KeyboardEvent, useEffect, useRef, useState } from 'react'

export type EditableTextSize = 'sm' | 'base' | 'lg' | 'xl'

export interface EditableTextProps {
  ariaLabel: string
  /**
   * Focuses the field on mount. It is for the field that takes a trigger's place:
   * whoever clicked has already asked to write, and a second click to reach the
   * cursor is not part of that request.
   */
  autoFocus?: boolean
  className?: string
  /**
   * The literal value the entity stores for "empty" — it disappears on focus, so
   * it is not erased character by character by whoever is naming the record.
   */
  emptyValue?: string
  /**
   * Rewrites the draft on every keystroke — a document's punctuation, for
   * example. Without it, a format that is typed would force the composer to
   * reimplement the draft outside the field.
   */
  formatDraft?: (value: string) => string
  /** Accepts line breaks and grows with the content; `Enter` stops committing. */
  multiline?: boolean
  placeholder?: string
  /** Renderiza o valor como texto, sem campo. */
  readOnly?: boolean
  /**
   * An empty draft goes back to the confirmed value instead of committing `null`
   * — for the field the contract requires non-empty.
   */
  revertWhenEmpty?: boolean
  /** Escala do texto: `sm` 14px, `base` 1rem, `lg` 1.5rem, `xl` 2rem. */
  size?: EditableTextSize
  type?: 'email' | 'text'
  value: string | null
  /** Receives `null` when the field is emptied, except under `revertWhenEmpty`. */
  onCommit: (value: string | null) => void
  /**
   * Leaving the field, whether a commit happened or not. It is what closes an
   * edit the surface opened: an untouched draft does not commit, and without this
   * the field would stay open in place of the value.
   */
  onBlur?: () => void
}

const sizeClassName: Record<EditableTextSize, string> = {
  base: 'text-base',
  lg: 'text-2xl',
  sm: 'text-sm',
  // 2rem has no token in the Tailwind scale: `text-3xl` is 1.875rem.
  xl: 'text-[2rem]',
}

// The field is edited in place of the text: any frame on focus would give away
// the box the surface hides. The caret is the focus indicator.
const fieldClassName =
  'w-full bg-transparent outline-none placeholder:text-foreground/40 focus:outline-none focus-visible:outline-none'

/**
 * A text field edited in place: local draft, commit on `blur` — a PATCH per
 * character would flood the API, and a uniqueness collision can only be judged
 * over the final value. `Enter` drops focus, and it is the `blur` that persists;
 * `Escape` returns the draft to the confirmed value.
 *
 * It knows no field, mutation or route: it takes the value and hands back the
 * commit. The text scale is `size`; weight, family and width stay with the
 * composer.
 */
export function EditableText({
  ariaLabel,
  autoFocus = false,
  className,
  emptyValue,
  formatDraft,
  multiline = false,
  placeholder,
  readOnly = false,
  revertWhenEmpty = false,
  size = 'base',
  type = 'text',
  value,
  onBlur,
  onCommit,
}: Readonly<EditableTextProps>) {
  const confirmed = value ?? ''
  const [draft, setDraft] = useState(confirmed)
  // The `blur` that `Escape` triggers would read state not yet applied; the
  // commit reads the draft by reference to decide over the already reverted value.
  const draftRef = useRef(draft)
  // The draft as it was on focus. "Dirty" is what the person typed — clearing
  // the `emptyValue` on entry is our own doing, and cannot count as their edit.
  const draftAtFocus = useRef(draft)
  const isFocused = useRef(false)

  const writeDraft = (next: string) => {
    draftRef.current = next
    setDraft(next)
  }

  const writeTyped = (next: string) => writeDraft(formatDraft ? formatDraft(next) : next)

  useEffect(() => {
    // A refetch does not step over someone who is typing.
    if (isFocused.current) return
    draftRef.current = value ?? ''
    setDraft(value ?? '')
  }, [value])

  // The domain default is not a name somebody wrote: while it is there, the
  // field reads as a placeholder, and not as a confirmed value.
  const showsEmptyValue = !draft || draft === emptyValue
  const emptyClassName = showsEmptyValue ? 'text-foreground/40' : undefined

  if (readOnly) {
    return (
      <span
        className={cn(sizeClassName[size], emptyClassName, className)}
        data-slot='editable-text'
      >
        {value ?? placeholder}
      </span>
    )
  }

  const isDirty = () => draftRef.current !== draftAtFocus.current

  const commit = () => {
    if (!isDirty()) return writeDraft(confirmed)
    const next = draftRef.current.trim()
    if (!next && revertWhenEmpty) return writeDraft(confirmed)
    // `''` is not "no value" to the contract — absence is `null`.
    if (next !== confirmed) onCommit(next || null)
  }

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    if (event.key === 'Escape') {
      // With no dirty draft the event bubbles: inside a dialog, the first
      // `Escape` cancels the edit and only the second closes the dialog.
      if (!isDirty()) return
      event.stopPropagation()
      writeDraft(confirmed)
      event.currentTarget.blur()
      return
    }

    if (event.key === 'Enter' && !multiline) {
      // Leaving the field is what persists — committing here would duplicate the `blur`.
      event.preventDefault()
      event.currentTarget.blur()
    }
  }

  const fieldProps = {
    'aria-label': ariaLabel,
    autoFocus,
    'data-slot': 'editable-text',
    onBlur: () => {
      isFocused.current = false
      commit()
      onBlur?.()
    },
    onFocus: () => {
      isFocused.current = true
      if (emptyValue !== undefined && draftRef.current === emptyValue) writeDraft('')
      draftAtFocus.current = draftRef.current
    },
    onKeyDown: handleKeyDown,
    placeholder,
    value: draft,
  }

  if (multiline) {
    return (
      <textarea
        {...fieldProps}
        className={cn(
          'field-sizing-content resize-none',
          fieldClassName,
          sizeClassName[size],
          emptyClassName,
          className,
        )}
        onChange={(event) => writeTyped(event.target.value)}
        rows={1}
      />
    )
  }

  return (
    <input
      {...fieldProps}
      className={cn(fieldClassName, sizeClassName[size], emptyClassName, className)}
      onChange={(event) => writeTyped(event.target.value)}
      type={type}
    />
  )
}
