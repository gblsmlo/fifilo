import { afterEach, describe, expect, test } from 'bun:test'

await import('../test/dom')

const { cleanup, render } = await import('@testing-library/react')
const { SettingsRow } = await import('./settings-row')

afterEach(cleanup)

describe('SettingsRow', () => {
  test('separa title e description da esquerda do que o consumidor renderiza à direita', () => {
    const { container } = render(
      <SettingsRow description='Como os nomes aparecem' title='Nomes de exibição'>
        <button type='button'>Nome completo</button>
      </SettingsRow>,
    )

    expect(container.querySelector('[data-slot="settings-row-title"]')?.textContent).toBe(
      'Nomes de exibição',
    )
    expect(container.querySelector('[data-slot="settings-row-description"]')?.textContent).toBe(
      'Como os nomes aparecem',
    )
    expect(container.querySelector('[data-slot="settings-row-trailing"]')?.textContent).toBe(
      'Nome completo',
    )
  })

  test('sem description e sem filhos só o title é desenhado', () => {
    const { container } = render(<SettingsRow title='E-mail' />)

    expect(container.querySelector('[data-slot="settings-row-description"]')).toBeNull()
    expect(container.querySelector('[data-slot="settings-row-trailing"]')).toBeNull()
  })
})
