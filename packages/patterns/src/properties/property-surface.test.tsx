import { afterEach, describe, expect, test } from 'bun:test'

await import('../test/dom')

const { cleanup, render, screen } = await import('@testing-library/react')
const { PropertySurface } = await import('./property-surface')

afterEach(cleanup)

function surface(): HTMLElement {
  return screen
    .getByText('Sem responsável')
    .closest('[data-slot="property-surface"]') as HTMLElement
}

describe('PropertySurface', () => {
  test('marks the badge surface as empty when muted', () => {
    render(<PropertySurface muted>Sem responsável</PropertySurface>)

    expect(surface().getAttribute('data-empty')).toBe('true')
  })

  test('marks the plain surface as empty when muted', () => {
    render(
      <PropertySurface muted variant='plain'>
        Sem responsável
      </PropertySurface>,
    )

    expect(surface().getAttribute('data-empty')).toBe('true')
  })

  test('leaves a filled surface without the empty mark', () => {
    render(<PropertySurface>Sem responsável</PropertySurface>)

    expect(surface().hasAttribute('data-empty')).toBe(false)
  })
})
