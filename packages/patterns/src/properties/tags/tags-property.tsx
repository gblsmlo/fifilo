'use client'

import { badgeVariants } from '@fifilo/ui/components/badge'
import { Button } from '@fifilo/ui/components/button'
import {
  Combobox,
  ComboboxChip,
  ComboboxChips,
  ComboboxEmpty,
  ComboboxItem,
  ComboboxList,
  ComboboxPopup,
  ComboboxStatus,
} from '@fifilo/ui/components/combobox'
import { cn } from '@fifilo/ui/lib/utils'
import { PlusIcon, TagIcon } from 'lucide-react'
import type React from 'react'
import { useMemo, useRef, useState } from 'react'
import { PropertySurface, type PropertyVariant } from '../property-surface'
import { PropertyTrigger } from '../property-trigger'

export interface TagsPropertyOption<TValue extends string = string> {
  label: string
  value: TValue
}

export type TagsPropertyDropdownPlacement = Pick<
  React.ComponentProps<typeof ComboboxPopup>,
  'align' | 'alignOffset' | 'side' | 'sideOffset'
>

export interface TagsPropertyActionContext<TValue extends string = string> {
  added: TagsPropertyOption<TValue> | null
  previousValue: readonly TValue[]
  removed: TagsPropertyOption<TValue> | null
}

export interface TagsPropertyProps<TValue extends string = string> {
  value: readonly TValue[]
  options: readonly TagsPropertyOption<TValue>[]
  action?: (value: readonly TValue[], context: TagsPropertyActionContext<TValue>) => void
  /**
   * Vocabulary of what the collection holds, when it is not a "tag": the empty
   * trigger, the accessible name of each chip's remove control and the empty
   * search message.
   */
  addLabel?: string
  ariaLabel?: string
  className?: string
  emptyLabel?: string
  disabled?: boolean
  /**
   * `chips` shows each tag; `count` shows only the amount in a compact trigger,
   * for a collection row where the width belongs to the other properties.
   */
  display?: 'chips' | 'count'
  dropdownPlacement?: TagsPropertyDropdownPlacement
  isLoading?: boolean
  placeholder?: string
  readOnly?: boolean
  removeLabel?: (label: string) => string
  variant?: PropertyVariant
  onValueChange?: (value: readonly TValue[]) => void
}

export function TagsProperty<TValue extends string = string>({
  action,
  addLabel = 'Adicionar tag',
  ariaLabel = 'Tags',
  className,
  emptyLabel = 'Nenhuma tag encontrada.',
  disabled = false,
  display = 'chips',
  dropdownPlacement,
  isLoading = false,
  onValueChange,
  options,
  placeholder = 'Adicionar uma tag',
  readOnly = false,
  removeLabel = (label) => `Remover tag ${label}`,
  value,
  variant = 'plain',
}: Readonly<TagsPropertyProps<TValue>>) {
  const [open, setOpen] = useState(false)
  // `ComboboxPopup` anchors on `ComboboxChips`, which only the chips case mounts.
  // Without that anchor the counter's popup opens invisible in the viewport corner.
  const countTriggerRef = useRef<HTMLButtonElement>(null)
  const selectedOptions = useMemo(
    () =>
      value.map(
        (selectedValue) =>
          options.find((option) => option.value === selectedValue) ?? {
            label: selectedValue,
            value: selectedValue,
          },
      ),
    [options, value],
  )
  const canUpdate = Boolean(action ?? onValueChange)

  if (readOnly || !canUpdate) {
    return (
      <fieldset
        aria-label={ariaLabel}
        className={cn('m-0 flex min-w-0 flex-wrap gap-1 border-0 p-0', className)}
        data-display={display}
        data-slot='tags-property'
        data-variant={variant}
      >
        {display === 'count' ? (
          <PropertySurface muted={selectedOptions.length === 0} variant={variant}>
            <TagsCountContent count={selectedOptions.length} />
          </PropertySurface>
        ) : selectedOptions.length > 0 ? (
          selectedOptions.map((option) => (
            <PropertySurface key={option.value} variant={variant}>
              {option.label}
            </PropertySurface>
          ))
        ) : (
          <PropertySurface muted variant={variant}>
            {placeholder}
          </PropertySurface>
        )}
      </fieldset>
    )
  }

  return (
    <div
      className={cn(display === 'count' ? 'min-w-0' : 'min-w-0 w-full', className)}
      data-display={display}
      data-slot='tags-property'
      data-variant={variant}
    >
      <Combobox<TagsPropertyOption<TValue>, true>
        autoHighlight
        disabled={disabled}
        itemToStringLabel={(option) => option.label}
        itemToStringValue={(option) => option.value}
        items={options}
        multiple
        onOpenChange={setOpen}
        onValueChange={(nextOptions) => {
          const nextValue = nextOptions.map((option) => option.value)
          const previousValues = new Set(value)
          const nextValues = new Set(nextValue)
          const added = nextOptions.find((option) => !previousValues.has(option.value)) ?? null
          const removed = selectedOptions.find((option) => !nextValues.has(option.value)) ?? null

          if (action) {
            action(nextValue, { added, previousValue: value, removed })
            return
          }
          onValueChange?.(nextValue)
        }}
        open={open}
        value={selectedOptions}
      >
        {display === 'count' ? (
          <PropertyTrigger
            aria-label={ariaLabel}
            muted={selectedOptions.length === 0}
            onClick={() => setOpen(true)}
            render={<button disabled={disabled} ref={countTriggerRef} type='button' />}
            variant={variant}
          >
            <TagsCountContent count={selectedOptions.length} />
          </PropertyTrigger>
        ) : (
          <ComboboxChips
            className={cn(
              variant === 'plain' &&
                'min-h-7 border-transparent! bg-transparent! p-0 shadow-none! before:hidden focus-within:border-transparent! focus-within:ring-2 sm:min-h-6 dark:bg-transparent!',
            )}
          >
            {selectedOptions.map((option) => (
              <ComboboxChip
                className={cn(badgeVariants({ variant: 'secondary' }), 'pe-0')}
                key={option.value}
                removeProps={{ 'aria-label': removeLabel(option.label) }}
              >
                {option.label}
              </ComboboxChip>
            ))}
            {/* Sem tag nenhuma o gatilho precisa se explicar, e vira um chip
                rotulado. Com tags na fileira o contexto já está dado: sobra o
                sinal de adicionar, sem repetir a palavra ao lado de cada uma. */}
            <Button
              aria-label={selectedOptions.length > 0 ? addLabel : undefined}
              // `Button` brings `[&_svg]:-mx-0.5` and an icon scale of its own; in
              // a chip that shrinks the glyph and glues it to the label, breaking
              // alignment with the tags next to it. An explicit size on the icon
              // turns both scale rules off, and the margin goes back to zero.
              className={cn(
                badgeVariants({ variant: 'secondary' }),
                // `Button` sizes its height with a `sm:` step, which `twMerge`
                // keeps against the badge's unprefixed `h-6`.
                'sm:h-6',
                '[&_svg]:mx-0',
                selectedOptions.length > 0 ? 'w-6 px-0' : 'gap-1',
              )}
              disabled={disabled}
              onClick={() => setOpen(true)}
              type='button'
              variant='ghost'
            >
              {selectedOptions.length > 0 ? (
                <PlusIcon aria-hidden='true' className='size-3.5' />
              ) : (
                <>
                  <TagIcon aria-hidden='true' className='size-3.5' />
                  {addLabel}
                </>
              )}
            </Button>
          </ComboboxChips>
        )}
        <ComboboxPopup
          {...dropdownPlacement}
          align={dropdownPlacement?.align ?? 'end'}
          anchor={display === 'count' ? countTriggerRef : undefined}
          // Tied to a small trigger, the popup takes the content width, like the
          // neighbouring selects'; only the chips one fixes the search box width.
          className={cn(
            'max-w-[calc(100vw-2rem)]',
            display === 'count' ? 'min-w-40!' : 'w-64 min-w-0!',
          )}
        >
          {isLoading ? <ComboboxStatus>Carregando tags…</ComboboxStatus> : null}
          <ComboboxEmpty>{emptyLabel}</ComboboxEmpty>
          <ComboboxList>
            {(option) => (
              <ComboboxItem key={option.value} value={option}>
                {option.label}
              </ComboboxItem>
            )}
          </ComboboxList>
        </ComboboxPopup>
      </Combobox>
    </div>
  )
}

function TagsCountContent({ count }: Readonly<{ count: number }>) {
  if (count === 0) {
    return <span>Sem Tag</span>
  }

  return (
    <>
      <TagIcon aria-hidden='true' className='size-3' />
      <span>{count === 1 ? 'Tag' : 'Tags'}</span>
      <span className='tabular-nums'>{count}</span>
    </>
  )
}
