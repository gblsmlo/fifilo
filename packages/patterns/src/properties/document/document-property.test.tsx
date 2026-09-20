import { afterEach, describe, expect, mock, test } from 'bun:test'

await import('../../test/dom')

const { cleanup, fireEvent, render, screen } = await import('@testing-library/react')
const { DocumentProperty } = await import('./document-property')

afterEach(cleanup)

const open = (name: string) => {
  fireEvent.click(screen.getByRole('button', { name }))
  return screen.getByRole('textbox', { name: 'CPF' })
}

const write = (field: HTMLElement, value: string) => {
  fireEvent.focus(field)
  fireEvent.change(field, { target: { value } })
  fireEvent.blur(field)
}

describe('DocumentProperty', () => {
  test('leaving without writing returns the row to reading', () => {
    const onCommit = mock(() => undefined)
    render(<DocumentProperty ariaLabel='CPF' kind='cpf' onCommit={onCommit} value={null} />)

    const field = open('Adicionar CPF')
    fireEvent.focus(field)
    fireEvent.blur(field)

    expect(screen.queryByRole('textbox', { name: 'CPF' })).toBeNull()
    expect(onCommit).not.toHaveBeenCalled()
  })

  // A refusal that traps the row open has no way out: the number stays
  // correctable, but giving up has to be possible too.
  test('the refusal does not trap the row, and the refused number comes back on reopening', () => {
    const onCommit = mock(() => undefined)
    render(<DocumentProperty ariaLabel='CPF' kind='cpf' onCommit={onCommit} value={null} />)

    write(open('Adicionar CPF'), '11222333000181')

    expect(screen.getByRole('alert').textContent).toBe('Informe um CPF válido.')
    expect(screen.queryByRole('textbox', { name: 'CPF' })).toBeNull()
    expect(onCommit).not.toHaveBeenCalled()

    expect(open('Adicionar CPF')).toHaveProperty('value', '11.222.333/0001-81')
    expect(screen.queryByRole('alert')).toBeNull()
  })

  test('esvaziar uma fileira preenchida apaga o documento', () => {
    const onCommit = mock(() => undefined)
    render(
      <DocumentProperty ariaLabel='CPF' kind='cpf' onCommit={onCommit} value='•••.•••.•••-09' />,
    )

    write(open('CPF: •••.•••.•••-09'), '')

    expect(onCommit).toHaveBeenCalledWith(null)
  })

  test('with no writing, the row is text and offers no field', () => {
    render(<DocumentProperty ariaLabel='CPF' kind='cpf' value='•••.•••.•••-09' />)

    expect(screen.getByLabelText('CPF: •••.•••.•••-09')).toBeTruthy()
    expect(screen.queryByRole('textbox')).toBeNull()
  })

  test('whoever takes over the refusal receives the number and the property keeps quiet about its own', () => {
    const onReject = mock(() => undefined)
    render(
      <DocumentProperty
        ariaLabel='CPF'
        kind='cpf'
        onCommit={() => undefined}
        onReject={onReject}
        value={null}
      />,
    )

    write(open('Adicionar CPF'), '11222333000181')

    expect(onReject).toHaveBeenCalledWith('11.222.333/0001-81', 'Informe um CPF válido.')
    expect(screen.queryByRole('alert')).toBeNull()
  })
})
