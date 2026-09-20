'use client'

import {
  MenuRadioGroup,
  MenuRadioItem,
  MenuSub,
  MenuSubPopup,
  MenuSubTrigger,
} from '@fifilo/ui/components/menu'
import type { LucideIcon } from 'lucide-react'
import type { ReactElement } from 'react'

/**
 * `MenuRadioGroup` cannot represent the absence of a choice: `value=''` leaves
 * the group with no item checked, and the "all" option becomes indistinguishable
 * from no option at all. The sentinel takes that place in the UI and is
 * translated back to `''` at the boundary.
 */
const CLEAR_VALUE = '__all__'

export interface FilterRadioSubmenuProps {
  clearLabel?: string
  icon: LucideIcon
  label: string
  /** Receives `''` when the "all" option is chosen. */
  onValueChange: (value: string) => void
  options: readonly (readonly [string, string])[]
  value?: string
}

/**
 * Single-value filter submenu — the shape consumers repeat inside
 * `ViewSettingsMenu`. The package provides the frame and the semantics of
 * "all"; which options exist and what each one means belongs to the consumer.
 */
export function FilterRadioSubmenu({
  clearLabel = 'Todos',
  icon: Icon,
  label,
  onValueChange,
  options,
  value,
}: Readonly<FilterRadioSubmenuProps>): ReactElement {
  return (
    <MenuSub>
      <MenuSubTrigger>
        <Icon aria-hidden='true' />
        {label}
      </MenuSubTrigger>
      <MenuSubPopup>
        <MenuRadioGroup
          onValueChange={(next) => onValueChange(next === CLEAR_VALUE ? '' : next)}
          value={value || CLEAR_VALUE}
        >
          <MenuRadioItem value={CLEAR_VALUE}>{clearLabel}</MenuRadioItem>
          {options.map(([optionValue, optionLabel]) => (
            <MenuRadioItem key={optionValue} value={optionValue}>
              {optionLabel}
            </MenuRadioItem>
          ))}
        </MenuRadioGroup>
      </MenuSubPopup>
    </MenuSub>
  )
}
