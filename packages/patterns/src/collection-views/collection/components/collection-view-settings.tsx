'use client'

import {
  MenuGroup,
  MenuGroupLabel,
  MenuItem,
  MenuPopup,
  Menu as MenuRoot,
  MenuSeparator,
} from '@fifilo/ui/components/menu'
import { RotateCcwIcon, SaveIcon, SlidersHorizontalIcon } from 'lucide-react'
import type { ReactElement, ReactNode } from 'react'
import { CollectionToolbarMenuTrigger } from './collection-toolbar-menu-trigger'

export interface ViewSettingsMenuProps {
  /** Disappears from the trigger label when zero, in the same grammar as `FilterMenu`. */
  activeFilterCount?: number
  children: ReactNode
  className?: string
  clearLabel?: string
  label?: string
  onClearFilters: () => void
  /** With no handler the footer does not compose the item: saving a preference is optional. */
  onSavePreference?: () => void
  savePreferenceDisabled?: boolean
  savePreferenceLabel?: string
}

export interface ViewSettingsSectionProps {
  children: ReactNode
  label: ReactNode
}

/**
 * The single surface for view settings: advanced filtering and configuration
 * stop being two neighbouring triggers and become sections of one menu.
 *
 * The package does not decide which sections exist — only the frame, the count
 * in the label and the clear footer. What each section offers is the consumer's.
 */
export function ViewSettingsMenu({
  activeFilterCount = 0,
  children,
  className,
  clearLabel = 'Limpar filtros',
  label = 'Exibição',
  onClearFilters,
  onSavePreference,
  savePreferenceDisabled = false,
  savePreferenceLabel = 'Salvar preferência',
}: Readonly<ViewSettingsMenuProps>): ReactElement {
  const normalizedActiveCount = Math.max(0, activeFilterCount)
  const triggerLabel = normalizedActiveCount ? `${label} (${normalizedActiveCount})` : label

  return (
    <MenuRoot>
      <CollectionToolbarMenuTrigger className={className}>
        <SlidersHorizontalIcon aria-hidden='true' />
        {triggerLabel}
      </CollectionToolbarMenuTrigger>
      <MenuPopup align='end' className='w-56'>
        {children}
        <MenuSeparator />
        {/* Limpar antes de guardar: descartar volta ao ponto de partida, guardar
            avança a partir dele — a ordem é a mesma sequência de decisão. */}
        <MenuItem disabled={!normalizedActiveCount} onClick={onClearFilters}>
          <RotateCcwIcon aria-hidden='true' />
          {clearLabel}
        </MenuItem>
        {onSavePreference ? (
          <MenuItem disabled={savePreferenceDisabled} onClick={onSavePreference}>
            <SaveIcon aria-hidden='true' />
            {savePreferenceLabel}
          </MenuItem>
        ) : null}
      </MenuPopup>
    </MenuRoot>
  )
}

/** A named division inside `ViewSettingsMenu`. */
export function ViewSettingsSection({
  children,
  label,
}: Readonly<ViewSettingsSectionProps>): ReactElement {
  return (
    <MenuGroup>
      <MenuGroupLabel>{label}</MenuGroupLabel>
      {children}
    </MenuGroup>
  )
}
