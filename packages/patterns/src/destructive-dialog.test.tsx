import { afterEach, describe, expect, test } from 'bun:test'

await import('./test/dom')

const { cleanup, render, screen } = await import('@testing-library/react')
const { DestructiveDialog } = await import('./destructive-dialog')

afterEach(cleanup)

// O foco de abertura do Base UI é agendado fora do commit do React, então
// nenhum flush síncrono do Testing Library o alcança.
async function settleFocus() {
  for (let attempt = 0; attempt < 40 && document.activeElement === document.body; attempt += 1) {
    await Bun.sleep(10)
  }
}

const dialog = {
  confirmLabel: 'Arquivar tarefa',
  description: 'Arquivar não tem volta.',
  onConfirm: () => undefined,
  onOpenChange: () => undefined,
  open: true,
  title: 'Arquivar esta tarefa?',
}

describe('DestructiveDialog', () => {
  test('announces itself as alertdialog', () => {
    render(<DestructiveDialog {...dialog} />)

    expect(screen.getByRole('alertdialog')).toBeTruthy()
  })

  test('carries the destructive surface on the confirming action', () => {
    render(<DestructiveDialog {...dialog} />)

    expect(screen.getByRole('button', { name: 'Arquivar tarefa' }).className).toContain(
      'bg-destructive',
    )
  })

  test('opens with focus on the action that refuses, not on the one that destroys', async () => {
    render(<DestructiveDialog {...dialog} />)

    const cancel = screen.getByRole('button', { name: 'Cancelar' })

    await settleFocus()

    expect(document.activeElement).toBe(cancel)
  })

  test('dispensa restrita: nao ha botao de fechar', () => {
    render(<DestructiveDialog {...dialog} />)

    expect(screen.queryByRole('button', { name: 'Close' })).toBeNull()
  })

  test('disables both actions while the mutation is pending', () => {
    render(<DestructiveDialog {...dialog} confirmingLabel='Arquivando…' isConfirming />)

    expect(screen.getByRole('button', { name: 'Arquivando…' }).hasAttribute('disabled')).toBe(true)
    expect(screen.getByRole('button', { name: 'Cancelar' }).hasAttribute('disabled')).toBe(true)
  })

  test('announces the failure of the mutation', () => {
    render(<DestructiveDialog {...dialog} errorMessage='Não foi possível arquivar a tarefa.' />)

    expect(screen.getByRole('alert').textContent).toContain('Não foi possível arquivar')
  })

  test('confirms through the destructive action', () => {
    let confirmed = 0
    render(<DestructiveDialog {...dialog} onConfirm={() => (confirmed += 1)} />)

    screen.getByRole('button', { name: 'Arquivar tarefa' }).click()

    expect(confirmed).toBe(1)
  })
})
