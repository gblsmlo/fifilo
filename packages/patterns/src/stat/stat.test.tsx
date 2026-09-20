import { afterEach, describe, expect, test } from 'bun:test'

await import('../test/dom')

const { cleanup, render, screen } = await import('@testing-library/react')
const { Stat, StatGroup } = await import('./stat')

afterEach(cleanup)

describe('Stat', () => {
  test('renders label, value and hint in their slots and carries the tone', () => {
    const { container } = render(
      <Stat hint='até hoje' label='Disponível' tone='negative' value='-R$ 10,00' />,
    )

    const stat = container.querySelector<HTMLElement>('[data-slot="stat"]')
    expect(stat?.dataset.tone).toBe('negative')
    expect(container.querySelector('[data-slot="stat-label"]')?.textContent).toBe('Disponível')
    expect(container.querySelector('[data-slot="stat-value"]')?.textContent).toBe('-R$ 10,00')
    expect(container.querySelector('[data-slot="stat-hint"]')?.textContent).toBe('até hoje')
    expect(screen.queryByRole('status')).toBeNull()
  })

  test('loading swaps the value for a skeleton and announces the card as busy', () => {
    const { container } = render(<Stat label='Disponível' loading value='R$ 1,00' />)

    expect(screen.getByRole('status').getAttribute('aria-busy')).toBe('true')
    expect(container.querySelector('[data-slot="stat-skeleton"]')).not.toBeNull()
    expect(container.querySelector('[data-slot="stat-value"]')).toBeNull()
  })

  test('forwards root props so a consumer can anchor a test id', () => {
    render(<Stat data-testid='consolidated' label='Saldo' value='R$ 1,00' />)

    expect(screen.getByTestId('consolidated').textContent).toContain('R$ 1,00')
  })
})

describe('StatGroup', () => {
  test('lays the stats out in the requested columns', () => {
    const { container } = render(
      <StatGroup columns={2}>
        <Stat label='A' value='1' />
        <Stat label='B' value='2' />
      </StatGroup>,
    )

    const group = container.querySelector('[data-slot="stat-group"]')
    expect(group?.className).toContain('sm:grid-cols-2')
    expect(group?.querySelectorAll('[data-slot="stat"]')).toHaveLength(2)
  })
})
