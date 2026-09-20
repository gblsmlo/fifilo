'use client'

import { Button } from '@fifilo/ui/components/button'
import { Popover, PopoverPopup, PopoverTrigger } from '@fifilo/ui/components/popover'
import { cn } from '@fifilo/ui/lib/utils'
import { PhoneIcon, PlusIcon, XIcon } from 'lucide-react'
import { type FormEvent, useEffect, useState } from 'react'
import {
  type PhoneCountryCode,
  PhoneInput,
  formatPhoneNumber,
  phoneNumberSchema,
} from '../../phone-input'
import {
  IconLabelProperty,
  type IconLabelPropertyTrailingVisibility,
} from '../icon-label/icon-label-property'
import { PropertyCopy } from '../property-copy'
import { PropertySurface, type PropertyVariant } from '../property-surface'
import { PropertyTrigger } from '../property-trigger'

const phoneSchema = phoneNumberSchema()

export interface PhonePropertyActionContext {
  added: string | null
  previousValue: readonly string[]
  removed: string | null
}

export interface PhonePropertyProps {
  value: readonly string[]
  action?: (value: readonly string[], context: PhonePropertyActionContext) => void
  addLabel?: string
  ariaLabel?: string
  className?: string
  /** Names what goes to the clipboard; absent, the chip offers no copy. */
  copyLabel?: (value: string) => string
  /** Country assumed for a number typed in national format. */
  defaultCountry?: PhoneCountryCode
  /**
   * Refusal from the **consumer** — duplicate in the workspace, uniqueness,
   * role. Format does not come through here: the field carries the library that
   * formats and knows how to validate.
   */
  errorMessage?: string | null
  disabled?: boolean
  /**
   * `chips` shows one chip per value and collapses the trigger into the `+`;
   * `trigger` keeps a single trigger that goes on naming the property even when
   * filled. Side by side with another row, two identical `+` do not say which one
   * they belong to — that is the case `trigger` solves, and the whole edit lives
   * in the popup.
   */
  display?: 'chips' | 'trigger'
  /**
   * Closes the path to adding without making the row read-only: the numbers
   * already there stay removable. It serves the contract that holds a single
   * number — with one filled in, there is no second one to add.
   */
  addDisabled?: boolean
  /**
   * Labels for the popup entries, in order of precedence — a record holding a
   * primary and a secondary number declares both here. The list length is the
   * ceiling: with all of them filled, there is no other to add.
   */
  entryLabels?: readonly string[]
  inputPlaceholder?: string
  placeholder?: string
  readOnly?: boolean
  /** The type icon left of the value; a row that is already labelled does not need it. */
  showIcon?: boolean
  /** Visibility of the chip affordances; `hover` holds them back until the pointer arrives. */
  trailingVisibility?: IconLabelPropertyTrailingVisibility
  variant?: PropertyVariant
  onValueChange?: (value: readonly string[]) => void
}

/**
 * Phones as a row of chips, with the same trigger as `TagsProperty`: empty, the
 * trigger explains itself ("Adicionar telefone"); with numbers in the row the
 * context is already given and only the `+` remains, without repeating the word
 * next to each one.
 *
 * The difference from Tags is where the value comes from: a tag comes from a
 * closed catalog and the popup is a list; a phone is typed, and the popup is a
 * field. The component does not validate format — the consumer knows its own
 * domain contract and returns the refusal through `errorMessage`.
 */
export function PhoneProperty({
  action,
  addDisabled = false,
  addLabel = 'Adicionar telefone',
  ariaLabel = 'Telefones',
  className,
  copyLabel,
  defaultCountry,
  disabled = false,
  display = 'chips',
  entryLabels = ['Principal', 'Secundário'],
  errorMessage = null,
  inputPlaceholder,
  onValueChange,
  placeholder = 'Sem telefone',
  readOnly = false,
  showIcon = true,
  trailingVisibility,
  value,
  variant = 'plain',
}: Readonly<PhonePropertyProps>) {
  const [open, setOpen] = useState(false)
  // The popup edits the whole list, not one number at a time: whoever holds a
  // primary and a secondary needs to see both together to decide which is which.
  const [drafts, setDrafts] = useState<readonly (string | null)[]>([])
  const [errors, setErrors] = useState<readonly (string | null)[]>([])
  const canUpdate = Boolean(action ?? onValueChange)

  useEffect(() => {
    if (!open) return
    setDrafts(value.length > 0 ? [...value] : [null])
    setErrors([])
  }, [open, value])

  const commit = (next: readonly string[], context: PhonePropertyActionContext) => {
    if (action) {
      action(next, context)
      return
    }
    onValueChange?.(next)
  }

  /**
   * Format belongs to the field, not the consumer: the same library that formats
   * while typing can tell whether the number is complete, and refusing here
   * avoids sending the server what is already known to be invalid.
   */
  const save = () => {
    const nextErrors: (string | null)[] = []
    const saved: string[] = []

    for (const draft of drafts) {
      const raw = draft?.trim() ?? ''
      if (!raw) {
        // A blank line is an unfilled line, not an error: keep only what is there.
        nextErrors.push(null)
        continue
      }

      const parsed = phoneSchema.safeParse(raw)
      if (!parsed.success) {
        nextErrors.push(parsed.error.issues[0]?.message ?? 'Informe um telefone válido.')
        continue
      }
      // A repeat does not become a duplicate chip: the row represents distinct numbers.
      if (saved.includes(parsed.data)) {
        nextErrors.push('Este telefone já está na lista.')
        continue
      }

      nextErrors.push(null)
      saved.push(parsed.data)
    }

    setErrors(nextErrors)
    if (nextErrors.some(Boolean)) return

    const added = saved.find((phone) => !value.includes(phone)) ?? null
    const removed = value.find((phone) => !saved.includes(phone)) ?? null
    commit(saved, { added, previousValue: value, removed })
    setOpen(false)
  }

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    // The popup is a portal, and a React portal propagates events through the
    // component tree, not the DOM one: without containing it here, saving the
    // phone submits the form that composes the property.
    event.stopPropagation()
    save()
  }

  /**
   * Adding only makes sense once the previous one is complete: a blank line over
   * another blank line is not input, it is noise — and the incomplete number is
   * still going to change.
   */
  const canAddAnother =
    drafts.length < entryLabels.length &&
    drafts.every((draft) => phoneSchema.safeParse(draft?.trim() ?? '').success)

  if (readOnly || !canUpdate) {
    return (
      <fieldset
        aria-label={ariaLabel}
        className={cn('m-0 flex min-w-0 flex-wrap gap-1 border-0 p-0', className)}
        data-slot='phone-property'
        data-variant={variant}
      >
        {value.length > 0 ? (
          value.map((phone) => (
            <IconLabelProperty
              className={copyLabel ? 'pe-0' : undefined}
              icon={showIcon ? PhoneIcon : undefined}
              key={phone}
              label={formatPhoneNumber(phone)}
              // The label names the number as it reads; the clipboard receives
              // the E.164 one, which is what another system accepts.
              trailing={
                copyLabel ? (
                  <PropertyCopy label={copyLabel(formatPhoneNumber(phone))} value={phone} />
                ) : null
              }
              trailingVisibility={trailingVisibility}
              variant={variant}
            />
          ))
        ) : (
          <PropertySurface muted variant={variant}>
            {placeholder}
          </PropertySurface>
        )}
      </fieldset>
    )
  }

  /** The same form for both trigger arrangements. */
  const entryForm = (
    <PopoverPopup align='start' aria-label={addLabel} className='w-80'>
      <form className='grid gap-3 p-1' onSubmit={submit}>
        {drafts.map((draft, index) => (
          <div className='group/entry grid gap-1' key={entryLabels[index] ?? index}>
            {drafts.length > 1 || entryLabels.length > 1 ? (
              <span className='font-medium text-muted-foreground text-xs'>
                {entryLabels[index] ?? `${index + 1}`}
              </span>
            ) : null}
            <div className='flex items-center gap-1'>
              <PhoneInput
                ariaLabel={entryLabels[index] ?? addLabel}
                defaultCountry={defaultCountry}
                invalid={Boolean(errors[index])}
                // The Base UI popup closes on `Enter`. Containing the event in
                // the field itself — before it bubbles — is what allows saving
                // by keyboard without the popup vanishing underneath.
                onKeyDown={(event) => {
                  if (event.key !== 'Enter') return
                  event.preventDefault()
                  event.stopPropagation()
                  save()
                }}
                onValueChange={(next) => {
                  setDrafts(drafts.map((current, at) => (at === index ? next : current)))
                  setErrors(errors.map((current, at) => (at === index ? null : current)))
                }}
                placeholder={inputPlaceholder}
                value={draft}
              />
              {drafts.length > 1 ? (
                // Only shows on row hover: with both filled in the row stays
                // clean, and removal appears where the cursor already is.
                // `focus-within` keeps the keyboard path.
                <Button
                  aria-label={`Remover ${entryLabels[index] ?? ''} telefone`}
                  className='opacity-0 transition-opacity focus-visible:opacity-100 group-focus-within/entry:opacity-100 group-hover/entry:opacity-100'
                  onClick={() => {
                    setDrafts(drafts.filter((_, at) => at !== index))
                    setErrors(errors.filter((_, at) => at !== index))
                  }}
                  size='icon-sm'
                  type='button'
                  variant='ghost'
                >
                  <XIcon aria-hidden='true' />
                </Button>
              ) : null}
            </div>
            {errors[index] ? (
              <p className='text-destructive text-xs' role='alert'>
                {errors[index]}
              </p>
            ) : null}
          </div>
        ))}
        {errorMessage ? (
          <p className='text-destructive text-xs' role='alert'>
            {errorMessage}
          </p>
        ) : null}
        <div className='flex items-center justify-between gap-2'>
          <Button
            disabled={!canAddAnother}
            onClick={() => setDrafts([...drafts, null])}
            size='sm'
            type='button'
            variant='ghost'
          >
            <PlusIcon aria-hidden='true' />
            Adicionar outro
          </Button>
          <Button size='sm' type='submit' variant='secondary'>
            Salvar
          </Button>
        </div>
      </form>
    </PopoverPopup>
  )

  const [first] = value
  const summary =
    value.length > 1
      ? `${formatPhoneNumber(first ?? null)} +${value.length - 1}`
      : first
        ? formatPhoneNumber(first)
        : placeholder

  if (display === 'trigger') {
    return (
      <Popover onOpenChange={setOpen} open={open}>
        <PopoverTrigger
          render={
            <PropertyTrigger
              aria-label={value.length > 0 ? `${ariaLabel}: ${summary}` : ariaLabel}
              className={className}
              muted={value.length === 0}
              render={<button disabled={disabled} type='button' />}
              variant={variant === 'plain' ? 'plain' : 'badge'}
            >
              {showIcon ? <PhoneIcon aria-hidden='true' className='size-3' /> : null}
              <span className='truncate'>{summary}</span>
            </PropertyTrigger>
          }
        />
        {entryForm}
      </Popover>
    )
  }

  return (
    <fieldset
      aria-label={ariaLabel}
      className={cn('m-0 flex min-w-0 flex-wrap items-center gap-1 border-0 p-0', className)}
      data-slot='phone-property'
      data-variant={variant}
    >
      {value.map((phone) => (
        <IconLabelProperty
          className='pe-0'
          icon={showIcon ? PhoneIcon : undefined}
          key={phone}
          label={formatPhoneNumber(phone)}
          trailing={
            <>
              {copyLabel ? (
                <PropertyCopy label={copyLabel(formatPhoneNumber(phone))} value={phone} />
              ) : null}
              <button
                aria-label={`Remover telefone ${formatPhoneNumber(phone)}`}
                className='flex size-6 shrink-0 items-center justify-center rounded-full text-muted-foreground outline-none transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring'
                disabled={disabled}
                onClick={() =>
                  commit(
                    value.filter((current) => current !== phone),
                    { added: null, previousValue: value, removed: phone },
                  )
                }
                type='button'
              >
                <XIcon aria-hidden='true' className='size-3' />
              </button>
            </>
          }
          trailingVisibility={trailingVisibility}
          variant={variant}
        />
      ))}

      {addDisabled ? null : (
        <Popover onOpenChange={setOpen} open={open}>
          <PopoverTrigger
            render={
              <PropertyTrigger
                // Empty, the row reads like the other absent properties —
                // dimmed text saying there is no number, on the surface the
                // variant asks for — and what it does lives in the accessible
                // name. With numbers in it only the `+` remains, always a pill.
                aria-label={addLabel}
                className={cn(value.length > 0 && 'w-6 px-0')}
                muted={value.length === 0}
                render={<button disabled={disabled} type='button' />}
                variant={value.length > 0 ? 'badge' : variant}
              />
            }
          >
            {value.length > 0 ? (
              <PlusIcon aria-hidden='true' className='size-3.5' />
            ) : (
              <>
                {showIcon ? <PhoneIcon aria-hidden='true' className='size-3.5' /> : null}
                {placeholder}
              </>
            )}
          </PopoverTrigger>
          {entryForm}
        </Popover>
      )}
    </fieldset>
  )
}
