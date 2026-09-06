import { afterEach, describe, expect, test } from 'bun:test'

await import('../test/dom')

const { cleanup, render, screen } = await import('@testing-library/react')
const { SettingsRow } = await import('./settings-row')
const { SettingsSection } = await import('./settings-section')

afterEach(cleanup)

describe('SettingsSection', () => {
  test('com title vira uma section nomeada com o heading acima do card', () => {
    const { container } = render(
      <SettingsSection title='Geral'>
        <SettingsRow title='Nomes de exibição' />
        <SettingsRow title='Tema' />
      </SettingsSection>,
    )

    const section = screen.getByRole('region', { name: 'Geral' })
    expect(section.dataset.slot).toBe('settings-section')
    expect(screen.getByRole('heading', { level: 2, name: 'Geral' })).toBeTruthy()
    expect(
      container.querySelectorAll(
        '[data-slot="settings-section-card"] > [data-slot="settings-row"]',
      ),
    ).toHaveLength(2)
  })

  test('sem title é só o card, sem heading nem landmark', () => {
    const { container } = render(
      <SettingsSection>
        <SettingsRow title='E-mail' />
      </SettingsSection>,
    )

    expect(screen.queryByRole('region')).toBeNull()
    expect(screen.queryByRole('heading')).toBeNull()
    expect(container.querySelector('[data-slot="settings-section-card"]')).not.toBeNull()
  })
})
