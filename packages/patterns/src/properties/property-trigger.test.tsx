import { afterEach, describe, expect, test } from 'bun:test'

await import('../test/dom')

const { cleanup, render, screen } = await import('@testing-library/react')
const { PropertyTrigger } = await import('./property-trigger')

afterEach(cleanup)

describe('PropertyTrigger', () => {
  test('renders a button by default', () => {
    render(<PropertyTrigger aria-label='Responsável'>Sem responsável</PropertyTrigger>)

    expect(screen.getByRole('button', { name: 'Responsável' }).tagName).toBe('BUTTON')
  })

  test('keeps the element the caller asked for', () => {
    render(
      <PropertyTrigger aria-label='Responsável' render={<a href='#person'>Ana</a>}>
        Ana
      </PropertyTrigger>,
    )

    expect(screen.getByRole('link', { name: 'Responsável' })).toBeTruthy()
  })
})
