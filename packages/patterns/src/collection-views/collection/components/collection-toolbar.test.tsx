import { afterEach, describe, expect, mock, test } from 'bun:test'
import type { ComponentType, ReactNode } from 'react'

await import('../../../test/dom')

class MockResizeObserver {
  disconnect() {}
  observe() {}
  unobserve() {}
}

Object.assign(globalThis, { ResizeObserver: MockResizeObserver })

const { act, cleanup, fireEvent, render, screen } = await import('@testing-library/react')
const { MenuItem } = await import('@fifilo/ui/components/menu')
const collectionModule = await import('../index')
const CollectionToolbar = Reflect.get(collectionModule, 'CollectionToolbar') as ComponentType<{
  children?: ReactNode
  endSlot?: ReactNode
  startSlot?: ReactNode
}>
const ViewSettingsMenu = Reflect.get(collectionModule, 'ViewSettingsMenu') as ComponentType<{
  activeFilterCount?: number
  children: ReactNode
  onClearFilters: () => void
}>
const ViewSettingsSection = Reflect.get(collectionModule, 'ViewSettingsSection') as ComponentType<{
  children: ReactNode
  label: ReactNode
}>
const PresetsMenu = Reflect.get(collectionModule, 'PresetsMenu') as ComponentType<{
  children: ReactNode
  count: number
  countLabel?: string
  label: string
}>
const Action = Reflect.get(collectionModule, 'Action') as ComponentType<{
  disabled?: boolean
  label?: string
  onClick: () => void
}>

afterEach(cleanup)

// The two visual assertions in this file are here on purpose: `hover:bg-accent`
// is a pseudo-class, and CSS `:hover` does not answer a synthetic event — neither
// from Testing Library nor from a Storybook `play`. The class is the only evidence
// available.
describe('CollectionToolbar', () => {
  test('publishes one collection-owned toolbar API', () => {
    expect(typeof CollectionToolbar).toBe('function')
    expect(typeof ViewSettingsMenu).toBe('function')
    expect(typeof ViewSettingsSection).toBe('function')
    expect(typeof PresetsMenu).toBe('function')
    expect(Reflect.has(collectionModule, 'SavedViewsMenu')).toBe(false)
    // The two neighbouring triggers became sections of a single menu; the
    // catalog cannot offer the old arrangement again.
    expect(Reflect.has(collectionModule, 'FilterMenu')).toBe(false)
    expect(Reflect.has(collectionModule, 'SettingsMenu')).toBe(false)
    expect(typeof Action).toBe('function')
  })

  test('supports slots and free composition without leaking slots to the DOM', () => {
    render(
      <CollectionToolbar
        endSlot={<button type='button'>Ações</button>}
        startSlot={<button type='button'>Contexto</button>}
      >
        <span>Composição livre</span>
      </CollectionToolbar>,
    )

    const toolbar = screen.getByRole('toolbar', { name: 'Controles da coleção' })
    expect(toolbar.hasAttribute('startslot')).toBe(false)
    expect(toolbar.hasAttribute('endslot')).toBe(false)
    expect(screen.getByText('Composição livre')).toBeTruthy()
    expect(
      screen.getByRole('button', { name: 'Contexto' }).closest('[data-slot="toolbar-group"]'),
    ).toBeTruthy()
    expect(
      screen.getByRole('button', { name: 'Ações' }).closest('[data-slot="toolbar-group"]'),
    ).toBeTruthy()
  })

  test('keeps filter count and clear behavior in the shared composition', async () => {
    const onClear = mock(() => undefined)

    render(
      <CollectionToolbar
        endSlot={
          <ViewSettingsMenu activeFilterCount={2} onClearFilters={onClear}>
            <ViewSettingsSection label='Filtros'>
              <MenuItem>Status</MenuItem>
            </ViewSettingsSection>
          </ViewSettingsMenu>
        }
      />,
    )

    await act(async () => fireEvent.click(screen.getByRole('button', { name: 'Exibição (2)' })))
    await act(async () => fireEvent.click(screen.getByRole('menuitem', { name: 'Limpar filtros' })))
    expect(onClear).toHaveBeenCalledTimes(1)
  })

  test('keeps presets in the left slot with label, record count and a start-aligned menu', async () => {
    render(
      <CollectionToolbar
        startSlot={
          <PresetsMenu count={24} countLabel='24 tarefas' label='Minhas tarefas'>
            <MenuItem>Todos os filtros</MenuItem>
          </PresetsMenu>
        }
      />,
    )

    const savedViews = screen.getByRole('button', { name: /Minhas tarefas/ })
    expect(screen.getByText('24')).toBeTruthy()
    expect(screen.getByLabelText('24 tarefas')).toBeTruthy()
    expect(savedViews.className).toContain('hover:bg-accent')
    await act(async () => {
      fireEvent.click(savedViews)
      await new Promise((resolve) => setTimeout(resolve, 0))
    })
    const savedView = screen.getByRole('menuitem', { name: 'Todos os filtros' })
    expect(savedView).toBeTruthy()
    await act(async () => fireEvent.click(savedView))
  })

  test('keeps settings neutral and the insert action primary without an icon', async () => {
    const onClick = mock(() => undefined)

    render(
      <CollectionToolbar
        endSlot={
          <>
            <ViewSettingsMenu onClearFilters={() => undefined}>
              <ViewSettingsSection label='Exibição'>
                <MenuItem>Layout</MenuItem>
              </ViewSettingsSection>
            </ViewSettingsMenu>
            <Action label='Nova tarefa' onClick={onClick} />
          </>
        }
      />,
    )

    const settings = screen.getByRole('button', { name: 'Exibição' })
    expect(settings.className).toContain('hover:bg-accent')
    await act(async () => fireEvent.click(settings))
    expect(screen.getByRole('menu').className).toContain('w-56')
    await act(async () => fireEvent.click(settings))

    const action = screen.getByRole('button', { name: 'Nova tarefa' })
    expect(action.querySelector('svg')).toBeNull()
    await act(async () => fireEvent.click(action))
    expect(onClick).toHaveBeenCalledTimes(1)
  })
})
