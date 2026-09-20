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
const collectionModule = await import('../index')
type SearchFieldProps = {
  label?: string
  onCommit: (value: string) => void
  placeholder?: string
  value?: string
}
const CollectionSearchField = Reflect.get(
  collectionModule,
  'CollectionSearchField',
) as ComponentType<SearchFieldProps>
const CollectionToolbar = Reflect.get(collectionModule, 'CollectionToolbar') as ComponentType<{
  startSlot?: ReactNode
}>

/** The field only mounts inside the toolbar: `ToolbarInput` requires the Base UI context. */
const renderField = (props: SearchFieldProps) =>
  render(<CollectionToolbar startSlot={<CollectionSearchField {...props} />} />)

afterEach(cleanup)

describe('CollectionSearchField', () => {
  test('only confirms on submit — typing writes nothing', async () => {
    const onCommit = mock(() => undefined)
    renderField({ label: 'Buscar contatos', onCommit })

    const field = screen.getByRole('searchbox', { name: 'Buscar contatos' })
    await act(async () => fireEvent.change(field, { target: { value: 'ana' } }))
    expect(onCommit).toHaveBeenCalledTimes(0)

    await act(async () => fireEvent.submit(field.closest('form') as HTMLFormElement))
    expect(onCommit).toHaveBeenCalledWith('ana')
  })

  test('clearing the field confirms right away, otherwise the search stays stuck', async () => {
    const onCommit = mock(() => undefined)
    renderField({ onCommit, value: 'ana' })

    const field = screen.getByRole('searchbox', { name: 'Buscar' })
    await act(async () => fireEvent.change(field, { target: { value: '' } }))
    expect(onCommit).toHaveBeenCalledWith('')
  })

  test('rascunho acompanha o valor confirmado quando ele muda por fora', async () => {
    const onCommit = mock(() => undefined)
    const { rerender } = renderField({ onCommit, value: 'ana' })
    expect(screen.getByRole<HTMLInputElement>('searchbox', { name: 'Buscar' }).value).toBe('ana')

    await act(async () =>
      rerender(
        <CollectionToolbar
          startSlot={<CollectionSearchField onCommit={onCommit} value='bruno' />}
        />,
      ),
    )
    expect(screen.getByRole<HTMLInputElement>('searchbox', { name: 'Buscar' }).value).toBe('bruno')
  })
})
