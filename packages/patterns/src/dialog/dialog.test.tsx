import { afterEach, describe, expect, test } from 'bun:test'

await import('../test/dom')

const { cleanup, render, screen } = await import('@testing-library/react')
const { Dialog } = await import('./dialog')

afterEach(cleanup)

const base = {
  children: <p>Corpo do popup</p>,
  onOpenChange: () => undefined,
  open: true,
  title: 'Nova tarefa',
}

describe('Dialog shell', () => {
  test('names the popup by its title', () => {
    render(<Dialog {...base} />)

    expect(screen.getByRole('dialog', { name: 'Nova tarefa' })).toBeTruthy()
  })

  test('renders the body in the panel', () => {
    render(<Dialog {...base} />)

    expect(screen.getByText('Corpo do popup')).toBeTruthy()
  })

  test('draws the header description only when given', () => {
    const { rerender } = render(<Dialog {...base} />)
    expect(screen.queryByText('Projeto Aurora')).toBeNull()

    rerender(<Dialog {...base} description='Projeto Aurora' />)
    expect(screen.getByText('Projeto Aurora')).toBeTruthy()
  })

  test('draws the footer only when given', () => {
    const { rerender } = render(<Dialog {...base} />)
    expect(screen.queryByRole('button', { name: 'Criar' })).toBeNull()

    rerender(<Dialog {...base} footer={<button type='button'>Criar</button>} />)
    expect(screen.getByRole('button', { name: 'Criar' })).toBeTruthy()
  })

  test('draws the top actions only when given', () => {
    const { rerender } = render(<Dialog {...base} />)
    expect(screen.queryByRole('button', { name: 'Abrir em tela cheia' })).toBeNull()

    rerender(
      <Dialog
        {...base}
        actions={
          <button aria-label='Abrir em tela cheia' type='button'>
            ⤢
          </button>
        }
      />,
    )
    expect(screen.getByRole('button', { name: 'Abrir em tela cheia' })).toBeTruthy()
  })

  test('guards the panel with the loading state instead of the body', () => {
    render(
      <Dialog
        {...base}
        state='loading'
        stateSurface={{ description: 'Buscando os dados.', title: 'Carregando' }}
      />,
    )

    expect(screen.queryByText('Corpo do popup')).toBeNull()
    expect(screen.getByText('Carregando')).toBeTruthy()
  })

  test('takes the alertdialog role with restricted dismissal', () => {
    render(<Dialog {...base} role='alertdialog' />)

    expect(screen.getByRole('alertdialog', { name: 'Nova tarefa' })).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Close' })).toBeNull()
  })

  test('announces the failure of the footer action', () => {
    render(<Dialog {...base} errorMessage='Nao foi possivel criar a tarefa.' />)

    expect(screen.getByRole('alert').textContent).toContain('Nao foi possivel criar')
  })

  test('surfaces a failure state through StateSurface', () => {
    render(
      <Dialog
        {...base}
        state='error'
        stateSurface={{ description: 'Não foi possível carregar.', title: 'Falha ao carregar' }}
      />,
    )

    expect(screen.getByRole('alert').textContent).toContain('Falha ao carregar')
  })
})
