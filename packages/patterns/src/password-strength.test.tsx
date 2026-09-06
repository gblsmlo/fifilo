import { afterEach, describe, expect, test } from 'bun:test'

await import('./test/dom')

const { cleanup, render, screen } = await import('@testing-library/react')
const { PasswordStrength } = await import('./password-strength')

afterEach(cleanup)

const requirements = [
  { label: '12 caracteres', met: true },
  { label: 'Letras', met: true },
  { label: 'Numeros', met: false },
  { label: 'Simbolo', met: false },
]

describe('PasswordStrength', () => {
  test('reports progress as the number of requirements already met', () => {
    render(<PasswordStrength ariaLabel='Força da senha' requirements={requirements} />)

    const meter = screen.getByRole('progressbar', { name: 'Força da senha' })

    expect(meter.getAttribute('aria-valuenow')).toBe('2')
    expect(meter.getAttribute('aria-valuemax')).toBe('4')
  })

  test('announces each requirement state instead of relying on the icon', () => {
    render(<PasswordStrength ariaLabel='Força da senha' requirements={requirements} />)

    const items = screen.getAllByRole('listitem')

    expect(items[0]?.textContent).toBe('12 caracteresatendido')
    expect(items[2]?.textContent).toBe('Numerospendente')
  })

  test('stays valid when nothing was typed yet', () => {
    render(
      <PasswordStrength
        ariaLabel='Força da senha'
        requirements={requirements.map((requirement) => ({ ...requirement, met: false }))}
      />,
    )

    const meter = screen.getByRole('progressbar', { name: 'Força da senha' })

    expect(meter.getAttribute('aria-valuenow')).toBe('0')
  })
})
