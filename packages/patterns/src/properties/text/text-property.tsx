'use client'

import { cn } from '@fifilo/ui/lib/utils'
import { PlusIcon } from 'lucide-react'
import { useState } from 'react'
import { EditableText } from '../../editable-text'
import {
  IconLabelProperty,
  type IconLabelPropertyIcon,
  type IconLabelPropertyTrailingVisibility,
} from '../icon-label/icon-label-property'
import { PropertyCopy } from '../property-copy'
import { PropertyLink } from '../property-link'
import { type PropertyVariant, propertyFieldClassName } from '../property-surface'
import { PropertyTrigger } from '../property-trigger'

export type TextPropertyIcon = IconLabelPropertyIcon

export type TextPropertyEditing = 'inline' | 'trigger'

export interface TextPropertyProps {
  value: string | null
  /** Accessible name of the fill trigger; absent, it uses the `fallback`. */
  addLabel?: string
  ariaLabel?: string
  className?: string
  /**
   * Absent, the value offers no copy. The label names what goes to the
   * clipboard — "Copiar" repeated across a whole sidebar leaves no way to choose.
   */
  copyLabel?: string
  /** Keeps `onCommit` but closes writing: the property reads as read-only again. */
  disabled?: boolean
  /** Present, the value gains the affordance of opening the destination in another tab. */
  href?: string
  /** Names the destination of `href`; absent, the accessible name is the URL itself. */
  linkLabel?: string
  /**
   * How the empty property offers the fill. `inline` swaps the value for a field
   * edited in place — clicking is already writing, and that serves the unit that
   * is the showcase of a record. `trigger` shows the trigger beside it, in the
   * anatomy of the `+` of `TagsProperty`: it serves the row where the absent
   * value should not look like a field waiting for typing.
   */
  editing?: TextPropertyEditing
  fallback?: string
  icon?: TextPropertyIcon
  /**
   * An example of the expected format, shown inside the field. It is a different
   * thing from `fallback`: one says there is no value, the other teaches how the
   * value is written.
   */
  inputPlaceholder?: string
  iconClassName?: string
  /**
   * Copying and opening are secondary paths, so they wait for the pointer by
   * default: in plain sight on every row, the column of repeated icons competes
   * with the values for attention. `always` is for surfaces with no hover to offer.
   */
  trailingVisibility?: IconLabelPropertyTrailingVisibility
  variant?: PropertyVariant
  /** Absent, the property is read-only: it is the state of someone who cannot write. */
  onCommit?: (value: string | null) => void
}

export function TextProperty({
  addLabel,
  ariaLabel,
  className,
  copyLabel,
  disabled = false,
  editing = 'trigger',
  fallback = 'Não informado',
  href,
  icon: Icon,
  iconClassName,
  inputPlaceholder,
  linkLabel,
  trailingVisibility = 'hover',
  value,
  variant = 'badge',
  onCommit,
}: Readonly<TextPropertyProps>) {
  const [editingInline, setEditingInline] = useState(false)
  const text = value?.trim() || null
  // With no value there is nothing to copy: the icon would promise an action over the fallback.
  const copiable = Boolean(copyLabel && text)
  const editable = Boolean(onCommit) && !disabled

  const commit = (next: string | null) => {
    setEditingInline(false)
    onCommit?.(next)
  }

  // The trigger is not a field: while nobody has asked to write, the row keeps
  // reading as absence, and not as a blank form.
  if (editable && !text && editing === 'trigger' && !editingInline) {
    // With an icon of its own, the empty row already says which property each
    // trigger is; the generic `+` only serves those with no icon to show.
    const TriggerIcon = Icon ?? PlusIcon
    return (
      <PropertyTrigger
        aria-label={addLabel ?? fallback}
        className={className}
        muted
        render={<button onClick={() => setEditingInline(true)} type='button' />}
        variant={variant}
      >
        <TriggerIcon aria-hidden='true' className={cn('size-3.5', iconClassName)} />
        <span className='truncate'>{fallback}</span>
      </PropertyTrigger>
    )
  }

  const affordances =
    text && (copiable || href) ? (
      <>
        {href ? <PropertyLink href={href} label={linkLabel ?? href} /> : null}
        {copiable && copyLabel ? <PropertyCopy label={copyLabel} value={text} /> : null}
      </>
    ) : null

  // The field takes the label's place, inside the same surface: icon, copy and
  // absence tone stay the property's, not the field's.
  const label =
    editable && (editing === 'inline' || editingInline) ? (
      <EditableText
        ariaLabel={ariaLabel ?? fallback}
        className={propertyFieldClassName}
        onCommit={commit}
        placeholder={inputPlaceholder ?? fallback}
        size='sm'
        value={text}
      />
    ) : (
      (text ?? fallback)
    )

  return (
    <IconLabelProperty
      // With a field, the accessible name is the field's own: an `img` labelled
      // from the outside would announce the value twice.
      ariaLabel={typeof label === 'string' ? ariaLabel : undefined}
      className={cn(affordances && 'pe-0', className)}
      icon={Icon}
      iconClassName={iconClassName}
      label={label}
      muted={!text}
      trailing={affordances}
      trailingVisibility={trailingVisibility}
      variant={variant}
    />
  )
}
