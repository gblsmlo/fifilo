import { afterEach, describe, expect, mock, test } from 'bun:test'
import type { ComponentType, ReactNode } from 'react'

await import('../../../test/dom')

// `collection/index` reaches the Kanban, and dnd-kit reads `ResizeObserver` on import.
class MockResizeObserver {
  disconnect() {}
  observe() {}
  unobserve() {}
}

Object.assign(globalThis, { ResizeObserver: MockResizeObserver })

const { act, cleanup, fireEvent, render, screen } = await import('@testing-library/react')
const { CircleDotIcon } = await import('lucide-react')
const collectionModule = await import('../index')
const FilterRadioSubmenu = Reflect.get(collectionModule, 'FilterRadioSubmenu') as ComponentType<{
  clearLabel?: string
  icon: typeof CircleDotIcon
  label: string
  onValueChange: (value: string) => void
  options: readonly (readonly [string, string])[]
  value?: string
}>
const ViewSettingsMenu = Reflect.get(collectionModule, 'ViewSettingsMenu') as ComponentType<{
  children: ReactNode
  onClearFilters: () => void
}>
const ViewSettingsSection = Reflect.get(collectionModule, 'ViewSettingsSection') as ComponentType<{
  children: ReactNode
  label: ReactNode
}>
const CollectionToolbar = Reflect.get(collectionModule, 'CollectionToolbar') as ComponentType<{
  endSlot?: ReactNode
}>

/** The menu trigger is a `ToolbarButton`, which requires the Base UI context. */
const renderSubmenu = (submenu: ReactNode) =>
  render(
    <CollectionToolbar
      endSlot={
        <ViewSettingsMenu onClearFilters={() => undefined}>
          <ViewSettingsSection label='Filtros'>{submenu}</ViewSettingsSection>
        </ViewSettingsMenu>
      }
    />,
  )

const OPTIONS = [
  ['person', 'Pessoa'],
  ['organization', 'Organização'],
] as const

const openSubmenu = async (label: string) => {
  await act(async () => fireEvent.click(screen.getByRole('button', { name: 'Exibição' })))
  await act(async () => {
    fireEvent.click(screen.getByRole('menuitem', { name: label }))
    await new Promise((resolve) => setTimeout(resolve, 0))
  })
}

afterEach(cleanup)

describe('FilterRadioSubmenu', () => {
  test('checks the active option and returns the chosen value', async () => {
    const onValueChange = mock(() => undefined)
    renderSubmenu(
      <FilterRadioSubmenu
        icon={CircleDotIcon}
        label='Tipo'
        onValueChange={onValueChange}
        options={OPTIONS}
        value='person'
      />,
    )

    await openSubmenu('Tipo')
    expect(screen.getByRole('menuitemradio', { name: 'Pessoa' }).getAttribute('aria-checked')).toBe(
      'true',
    )
    await act(async () =>
      fireEvent.click(screen.getByRole('menuitemradio', { name: 'Organização' })),
    )
    expect(onValueChange).toHaveBeenCalledWith('organization')
  })

  test('with no value, "all" is the checked option and returns an empty string', async () => {
    const onValueChange = mock(() => undefined)
    renderSubmenu(
      <FilterRadioSubmenu
        icon={CircleDotIcon}
        label='Tipo'
        onValueChange={onValueChange}
        options={OPTIONS}
      />,
    )

    await openSubmenu('Tipo')
    const allOption = screen.getByRole('menuitemradio', { name: 'Todos' })
    expect(allOption.getAttribute('aria-checked')).toBe('true')

    await act(async () => fireEvent.click(allOption))
    // The `MenuRadioGroup` sentinel does not leak: the consumer gets absence of filter.
    expect(onValueChange).toHaveBeenCalledWith('')
  })
})
