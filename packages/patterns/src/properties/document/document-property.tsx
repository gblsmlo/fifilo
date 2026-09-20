'use client'

import { cn } from '@fifilo/ui/lib/utils'
import { useState } from 'react'
import { EditableText } from '../../editable-text'
import {
  IconLabelProperty,
  type IconLabelPropertyIcon,
  type IconLabelPropertyTrailingVisibility,
} from '../icon-label/icon-label-property'
import { PropertyCopy } from '../property-copy'
import { type PropertyVariant, propertyFieldClassName } from '../property-surface'
import {
  type DocumentPropertyKind,
  documentIssue,
  documentLabel,
  documentPlaceholder,
  maskDocument,
} from './document-mask'

export interface DocumentPropertyProps {
  /** Which document the row holds: it names the label and judges the typed number. */
  kind: DocumentPropertyKind
  value: string | null
  /** Accessible name of the fill trigger; absent, it is `Adicionar CPF`/`CNPJ`. */
  addLabel?: string
  ariaLabel?: string
  className?: string
  /**
   * Absent, the value offers no copy. The label names what goes to the
   * clipboard — "Copiar" repeated across a whole row leaves no way to choose.
   */
  copyLabel?: string
  /** Keeps `onCommit` but closes writing: the property reads as read-only again. */
  disabled?: boolean
  fallback?: string
  icon?: IconLabelPropertyIcon
  /** What the empty field shows; absent, it is the document's format. */
  inputPlaceholder?: string
  trailingVisibility?: IconLabelPropertyTrailingVisibility
  variant?: PropertyVariant
  /** Absent, the property is read-only: it is the state of someone who cannot write. */
  onCommit?: (value: string | null) => void
  /**
   * The number the property refused, with the reason. Receiving it, the composer
   * takes over the refusal — a form that holds the typed number because the
   * submission did not go through already shows it next to the other fields, and
   * the property keeps quiet about its own.
   */
  onReject?: (value: string, issue: string) => void
}

/**
 * CPF and CNPJ as a property: punctuation enters while typing, a number that is
 * not the expected document is refused in the row itself, and the label comes
 * from `kind`. Writing is born here — no consumer rewrites mask, placeholder or
 * refusal, and `document-mask.ts` is the only place the format lives.
 *
 * The field opens with the read value inside it, including when that value is
 * the redacted number (`•••.•••.•••-09`): that is what allows erasing the
 * document by emptying the field. Redacted it does not go through
 * `documentIssue`, so leaving without touching it writes nothing and resending
 * it is impossible.
 */
export function DocumentProperty({
  addLabel,
  ariaLabel,
  className,
  copyLabel,
  disabled = false,
  fallback,
  icon: Icon,
  inputPlaceholder,
  kind,
  trailingVisibility = 'hover',
  value,
  variant = 'badge',
  onCommit,
  onReject,
}: Readonly<DocumentPropertyProps>) {
  const [editing, setEditing] = useState(false)
  const [issue, setIssue] = useState<string | null>(null)
  // The refused number survives the row closing: correcting an entry is not
  // retyping it, and trapping it in the open field would be worse — leaving the
  // row is always possible.
  const [rejected, setRejected] = useState<string | null>(null)
  const text = value?.trim() || null
  const empty = fallback ?? `Sem ${documentLabel[kind]}`
  const editable = Boolean(onCommit) && !disabled

  // O campo abre com o que foi recusado, se houve recusa, e com o valor lido no
  // resto das vezes.
  const draftValue = rejected ?? text

  const commit = (next: string | null) => {
    const problem = next ? documentIssue(next, kind) : null
    setIssue(onReject ? null : problem)
    setRejected(problem ? next : null)
    setEditing(false)
    if (problem && next) {
      onReject?.(next, problem)
      return
    }
    onCommit?.(next)
  }

  // Reopening returns the refused number to the field and takes the refusal out
  // of the way: it spoke about what was written, and that is about to change.
  const open = () => {
    setIssue(null)
    setEditing(true)
  }

  const label = !editable ? (
    (text ?? empty)
  ) : editing ? (
    <EditableText
      ariaLabel={ariaLabel ?? documentLabel[kind]}
      autoFocus
      className={propertyFieldClassName}
      // The read value may be the redacted number, which is not a document:
      // touching it rewrites the whole thing, instead of punctuating bullets as
      // if they were digits.
      formatDraft={(draft) => (draft === draftValue ? draft : maskDocument(draft))}
      // The commit only happens when the draft changed; it is the `blur` that
      // returns the row to reading when nobody wrote anything.
      onBlur={() => setEditing(false)}
      onCommit={commit}
      placeholder={inputPlaceholder ?? documentPlaceholder[kind]}
      size='sm'
      value={draftValue}
    />
  ) : (
    <button
      aria-label={
        text
          ? `${ariaLabel ?? documentLabel[kind]}: ${text}`
          : (addLabel ?? `Adicionar ${documentLabel[kind]}`)
      }
      className='min-w-0 cursor-pointer truncate text-start'
      onClick={open}
      type='button'
    >
      {text ?? empty}
    </button>
  )

  // With no value there is nothing to copy: the icon would promise an action over the fallback.
  const affordance = copyLabel && text ? <PropertyCopy label={copyLabel} value={text} /> : undefined

  return (
    <>
      <IconLabelProperty
        // With a field inside, the accessible name is the field's own: an `img`
        // labelled from the outside would announce the value twice.
        ariaLabel={typeof label === 'string' ? ariaLabel : undefined}
        className={cn(affordance && 'pe-0', className)}
        icon={Icon}
        label={label}
        muted={!text}
        trailing={affordance}
        trailingVisibility={trailingVisibility}
        variant={variant}
      />
      {issue ? (
        <span className='text-destructive text-sm' role='alert'>
          {issue}
        </span>
      ) : null}
    </>
  )
}
