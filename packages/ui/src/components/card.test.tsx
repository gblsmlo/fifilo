import { afterEach, describe, expect, test } from 'bun:test'

await import('../test/dom')

const { cleanup, render, screen } = await import('@testing-library/react')
const { Card, cardVariants } = await import('./card')

afterEach(cleanup)

describe('cardVariants', () => {
  test('uses md density by default', () => {
    const className = cardVariants()

    expect(className).toContain('[--card-padding:--spacing(6)]')
    expect(className).toContain('[--card-section-gap:--spacing(4)]')
  })

  test.each([
    ['sm', '[--card-padding:--spacing(4)]'],
    ['md', '[--card-padding:--spacing(6)]'],
    ['lg', '[--card-padding:--spacing(8)]'],
  ] as const)('maps %s density to the expected padding', (density, expectedClass) => {
    expect(cardVariants({ density })).toContain(expectedClass)
  })
})

describe('Card', () => {
  test('exposes the effective default density', () => {
    render(<Card>Conteúdo</Card>)

    expect(screen.getByText('Conteúdo').getAttribute('data-density')).toBe('md')
  })

  test('supports a custom density', () => {
    render(<Card density='lg'>Conteúdo amplo</Card>)

    const card = screen.getByText('Conteúdo amplo')

    expect(card.getAttribute('data-density')).toBe('lg')
    expect(card.className).toContain('[--card-padding:--spacing(8)]')
  })
})
