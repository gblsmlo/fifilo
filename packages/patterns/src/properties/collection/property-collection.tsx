'use client'

import {
  Menu,
  MenuCheckboxItem,
  MenuGroup,
  MenuGroupLabel,
  MenuPopup,
  MenuTrigger,
} from '@fifilo/ui/components/menu'
import { cn } from '@fifilo/ui/lib/utils'
import { EllipsisIcon } from 'lucide-react'
import type React from 'react'
import { Fragment, useState } from 'react'
import type { PropertyIcon } from '../property-catalog'
import { PropertySurface } from '../property-surface'

export interface PropertyCollectionItem {
  id: string
  /** The property's name in the preferences menu. */
  label: string
  /** The property's icon in the preferences menu. */
  icon?: PropertyIcon
  /** Starts visible, before any user preference. */
  defaultVisible?: boolean
  /**
   * The Property rendered when visible; the empty state is its own affordance.
   * Without `render` the entry exists only in the menu, so the composer can wire
   * a block that does not fit the row of pills.
   */
  render?: () => React.ReactNode
}

export interface PropertyCollectionProps {
  /** Catalog of the collection's properties, in display order. */
  items: readonly PropertyCollectionItem[]
  ariaLabel?: string
  className?: string
  /** Visible ids in uncontrolled mode; overrides the items' own `defaultVisible`. */
  defaultVisible?: readonly string[]
  /** Title of the preferences menu. */
  menuLabel?: string
  /** Hides the preferences trigger; the row shows only the visible ones. */
  readOnly?: boolean
  /** Accessible label of the preferences trigger. */
  triggerLabel?: string
  /** Visible ids in controlled mode. */
  visible?: readonly string[]
  onVisibleChange?: (visible: readonly string[]) => void
}

export function PropertyCollection({
  ariaLabel,
  className,
  defaultVisible,
  items,
  menuLabel = 'Propriedades',
  onVisibleChange,
  readOnly = false,
  triggerLabel = 'Ajustar propriedades',
  visible,
}: Readonly<PropertyCollectionProps>) {
  const [uncontrolledVisible, setUncontrolledVisible] = useState<readonly string[]>(
    () => defaultVisible ?? items.filter((item) => item.defaultVisible).map((item) => item.id),
  )

  const visibleIds = visible ?? uncontrolledVisible
  const visibleSet = new Set(visibleIds)

  const toggle = (id: string) => {
    // Visibility changes, position does not: the result follows the catalog
    // order, so turning a property back on returns it to the same place.
    const next = items
      .filter((item) => (item.id === id ? !visibleSet.has(id) : visibleSet.has(item.id)))
      .map((item) => item.id)
    if (visible === undefined) {
      setUncontrolledVisible(next)
    }
    onVisibleChange?.(next)
  }

  return (
    <fieldset
      aria-label={ariaLabel}
      className={cn('flex min-w-0 flex-wrap items-center gap-1', className)}
      data-slot='property-collection'
    >
      {items
        .filter((item) => visibleSet.has(item.id) && item.render)
        .map((item) => (
          <Fragment key={item.id}>{item.render?.()}</Fragment>
        ))}
      {readOnly ? null : (
        <Menu>
          <MenuTrigger
            aria-label={triggerLabel}
            render={
              <PropertySurface
                className='text-muted-foreground'
                render={<button type='button' />}
              />
            }
          >
            <EllipsisIcon aria-hidden className='size-3.5' />
          </MenuTrigger>
          <MenuPopup align='start'>
            <MenuGroup>
              <MenuGroupLabel>{menuLabel}</MenuGroupLabel>
              {items.map((item) => {
                const Icon = item.icon
                return (
                  <MenuCheckboxItem
                    checked={visibleSet.has(item.id)}
                    closeOnClick={false}
                    indicatorSide='end'
                    key={item.id}
                    onCheckedChange={() => toggle(item.id)}
                  >
                    <span className='flex min-w-0 items-center gap-2'>
                      {Icon ? <Icon aria-hidden className='size-4 text-muted-foreground' /> : null}
                      <span className='truncate'>{item.label}</span>
                    </span>
                  </MenuCheckboxItem>
                )
              })}
            </MenuGroup>
          </MenuPopup>
        </Menu>
      )}
    </fieldset>
  )
}
