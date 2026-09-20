import { afterEach, describe, expect, test } from 'bun:test'

await import('../test/dom')

const { cleanup, render, screen } = await import('@testing-library/react')
const { Widget, WidgetPanel } = await import('./widget')

afterEach(cleanup)

const surface = { description: 'Nada por aqui.', title: 'Sem dados' }

describe('Widget', () => {
  test('is a section named by its heading, with description, action and footer in their slots', () => {
    const { container } = render(
      <Widget
        action={<button type='button'>Nova</button>}
        description='Contas do workspace'
        footer={<span>Rodapé</span>}
        title='Contas'
      >
        <p>Corpo</p>
      </Widget>,
    )

    const section = screen.getByRole('region', { name: 'Contas' })
    expect(section.dataset.slot).toBe('widget')
    expect(screen.getByRole('heading', { level: 2, name: 'Contas' })).toBeTruthy()
    expect(container.querySelector('[data-slot="card-frame-description"]')?.textContent).toBe(
      'Contas do workspace',
    )
    expect(container.querySelector('[data-slot="card-frame-action"] button')?.textContent).toBe(
      'Nova',
    )
    expect(container.querySelector('[data-slot="widget-footer"]')?.textContent).toBe('Rodapé')
  })

  test('renders children straight into the frame when the state is data', () => {
    const { container } = render(
      <Widget state='data' surface={surface} title='Contas'>
        <table>
          <caption>Tabela</caption>
        </table>
      </Widget>,
    )

    expect(container.querySelector('[data-slot="widget-panel"]')).toBeNull()
    expect(container.querySelector('[data-slot="widget"] > table')).not.toBeNull()
  })

  test.each([
    'loading',
    'empty',
    'error',
    'permission',
  ] as const)('replaces the body with a panel for the %s state and never mounts the children', (state) => {
    const { container } = render(
      <Widget state={state} surface={surface} title='Contas'>
        <p>Registro confidencial</p>
      </Widget>,
    )

    expect(screen.queryByText('Registro confidencial')).toBeNull()
    expect(container.querySelector('[data-slot="widget-panel"]')).not.toBeNull()
    expect(screen.getByText('Sem dados')).toBeTruthy()
  })

  test('WidgetPanel is a card body inside the frame', () => {
    const { container } = render(
      <Widget title='Gráfico'>
        <WidgetPanel className='h-40'>
          <p>Conteúdo</p>
        </WidgetPanel>
      </Widget>,
    )

    const panel = container.querySelector<HTMLElement>('[data-slot="widget-panel"]')
    expect(panel?.dataset.slot).toBe('widget-panel')
    expect(panel?.querySelector('[data-slot="card-panel"]')?.className).toContain('h-40')
  })
})
