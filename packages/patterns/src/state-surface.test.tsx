import { afterEach, describe, expect, test } from 'bun:test'

await import('./test/dom')

const { cleanup, render, screen } = await import('@testing-library/react')
const { StateGuard, StateSurface } = await import('./state-surface')

afterEach(cleanup)

const surface = {
  description: 'Sem permissão sobre este recurso.',
  title: 'Acesso restrito',
}

describe('StateSurface', () => {
  test.each([
    ['error', 'alert'],
    ['permission', 'alert'],
    ['integration-disconnected', 'alert'],
    ['empty', 'status'],
    ['no-result', 'status'],
    ['sync-pending', 'status'],
  ] as const)('announces %s as %s', (kind, role) => {
    render(<StateSurface {...surface} kind={kind} />)

    expect(screen.getByRole(role)).toBeTruthy()
  })

  test('never renders a spinner: loading is not a kind here', () => {
    const { container } = render(<StateSurface {...surface} kind='empty' />)

    expect(container.querySelector('[data-slot="spinner"]')).toBeNull()
    expect(container.querySelector('svg')).toBeTruthy()
  })

  test('renders the actions the consumer provides', () => {
    const pressed: string[] = []
    render(
      <StateSurface
        {...surface}
        actions={[{ label: 'Tentar novamente', onPress: () => pressed.push('retry') }]}
        kind='error'
      />,
    )

    const action = screen.getByRole('button', { name: 'Tentar novamente' })
    action.click()
    expect(pressed).toEqual(['retry'])
  })
})

describe('StateGuard', () => {
  test('mounts children only for the data state', () => {
    const { rerender } = render(
      <StateGuard state='data' surface={surface}>
        <p>Registro confidencial</p>
      </StateGuard>,
    )
    expect(screen.getByText('Registro confidencial')).toBeTruthy()

    // A garantia que o JSDoc promete: nenhum estado que não seja `data` pode
    // montar os filhos, senão permission e error vazam registro.
    for (const state of ['permission', 'error', 'loading', 'empty'] as const) {
      rerender(
        <StateGuard state={state} surface={surface}>
          <p>Registro confidencial</p>
        </StateGuard>,
      )
      expect(screen.queryByText('Registro confidencial')).toBeNull()
    }
  })

  test('renders a dedicated, lighter treatment for loading instead of StateSurface', () => {
    const { container } = render(
      <StateGuard state='loading' surface={surface}>
        <p>Registro confidencial</p>
      </StateGuard>,
    )

    expect(container.querySelector('[data-slot="empty"]')).toBeNull()
    expect(container.querySelector('[data-slot="spinner"]')).toBeTruthy()
    expect(screen.getByRole('status')).toBeTruthy()
    expect(screen.getByText(surface.title)).toBeTruthy()
    expect(screen.getByText(surface.description)).toBeTruthy()
  })

  test('still renders StateSurface for every other guard state', () => {
    const { container } = render(
      <StateGuard state='error' surface={surface}>
        <p>Registro confidencial</p>
      </StateGuard>,
    )

    expect(container.querySelector('[data-slot="empty"]')?.getAttribute('data-kind')).toBe('error')
  })
})
