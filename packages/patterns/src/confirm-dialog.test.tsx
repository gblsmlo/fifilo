import { afterEach, describe, expect, test } from 'bun:test'

await import('./test/dom')

const { cleanup, render, screen } = await import('@testing-library/react')
const { ConfirmDialog } = await import('./confirm-dialog')

afterEach(cleanup)

const dialog = {
  confirmLabel: 'Publicar',
  description: 'A campanha fica visível para a equipe.',
  onConfirm: () => undefined,
  onOpenChange: () => undefined,
  open: true,
  title: 'Publicar a campanha?',
}

describe('ConfirmDialog', () => {
  test('is the neutral popup: papel dialog, nao alertdialog', () => {
    render(<ConfirmDialog {...dialog} />)

    expect(screen.getByRole('dialog', { name: 'Publicar a campanha?' })).toBeTruthy()
    expect(screen.queryByRole('alertdialog')).toBeNull()
  })

  test('never carries the destructive surface: destruction is DestructiveDialog', () => {
    render(<ConfirmDialog {...dialog} />)

    expect(screen.getByRole('button', { name: 'Publicar' }).className).not.toContain(
      'bg-destructive',
    )
  })

  test('dispensa normal: o shell desenha o botao de fechar', () => {
    render(<ConfirmDialog {...dialog} />)

    expect(screen.getByRole('button', { name: 'Close' })).toBeTruthy()
  })

  test('disables both actions while the mutation is pending', () => {
    render(<ConfirmDialog {...dialog} confirmingLabel='Publicando…' isConfirming />)

    expect(screen.getByRole('button', { name: 'Publicando…' }).hasAttribute('disabled')).toBe(true)
    expect(screen.getByRole('button', { name: 'Cancelar' }).hasAttribute('disabled')).toBe(true)
  })

  test('announces the failure of the mutation', () => {
    render(<ConfirmDialog {...dialog} errorMessage='Não foi possível publicar a campanha.' />)

    expect(screen.getByRole('alert').textContent).toContain('Não foi possível publicar')
  })

  test('confirms through the confirming action', () => {
    let confirmed = 0
    render(<ConfirmDialog {...dialog} onConfirm={() => (confirmed += 1)} />)

    screen.getByRole('button', { name: 'Publicar' }).click()

    expect(confirmed).toBe(1)
  })
})
