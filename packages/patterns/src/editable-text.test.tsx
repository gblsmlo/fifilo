import { afterEach, describe, expect, mock, test } from 'bun:test'

await import('./test/dom')

const { cleanup, fireEvent, render, screen } = await import('@testing-library/react')
const { EditableText } = await import('./editable-text')

afterEach(cleanup)

const field = (name = 'Título') => screen.getByLabelText(name) as HTMLInputElement

describe('EditableText', () => {
  test('does not commit while typing', () => {
    const onCommit = mock((_value: string | null) => undefined)
    render(<EditableText ariaLabel='Título' onCommit={onCommit} value='Contrato' />)

    fireEvent.change(field(), { target: { value: 'Contrato assinado' } })

    expect(onCommit).not.toHaveBeenCalled()
  })

  test('commits once on blur, and stays quiet once the value comes back confirmed', () => {
    const onCommit = mock((_value: string | null) => undefined)
    const { rerender } = render(
      <EditableText ariaLabel='Título' onCommit={onCommit} value='Contrato' />,
    )

    fireEvent.change(field(), { target: { value: 'Contrato assinado' } })
    fireEvent.blur(field())

    expect(onCommit).toHaveBeenCalledTimes(1)
    expect(onCommit).toHaveBeenCalledWith('Contrato assinado')

    rerender(<EditableText ariaLabel='Título' onCommit={onCommit} value='Contrato assinado' />)
    fireEvent.blur(field())

    expect(onCommit).toHaveBeenCalledTimes(1)
  })

  test('Enter commits a single-line field without a second commit from the blur', () => {
    const onCommit = mock((_value: string | null) => undefined)
    render(<EditableText ariaLabel='Título' onCommit={onCommit} value='Contrato' />)

    field().focus()
    fireEvent.change(field(), { target: { value: 'Contrato assinado' } })
    fireEvent.keyDown(field(), { key: 'Enter' })

    expect(onCommit).toHaveBeenCalledTimes(1)
    expect(onCommit).toHaveBeenCalledWith('Contrato assinado')
  })

  test('Enter does not commit a multiline field, leaving the line break to the browser', () => {
    const onCommit = mock((_value: string | null) => undefined)
    render(<EditableText ariaLabel='Descrição' multiline onCommit={onCommit} value='Resumo' />)

    field('Descrição').focus()
    fireEvent.change(field('Descrição'), { target: { value: 'Resumo do documento' } })
    fireEvent.keyDown(field('Descrição'), { key: 'Enter' })

    expect(onCommit).not.toHaveBeenCalled()
  })

  test('Escape restores the confirmed value and commits nothing', () => {
    const onCommit = mock((_value: string | null) => undefined)
    render(<EditableText ariaLabel='Título' onCommit={onCommit} value='Contrato' />)

    field().focus()
    fireEvent.change(field(), { target: { value: 'Rascunho descartado' } })
    fireEvent.keyDown(field(), { key: 'Escape' })

    expect(field().value).toBe('Contrato')
    expect(onCommit).not.toHaveBeenCalled()
  })

  test('empties into null', () => {
    const onCommit = mock((_value: string | null) => undefined)
    render(<EditableText ariaLabel='E-mail' onCommit={onCommit} value='ana@jars.test' />)

    fireEvent.change(field('E-mail'), { target: { value: '  ' } })
    fireEvent.blur(field('E-mail'))

    expect(onCommit).toHaveBeenCalledWith(null)
  })

  test('reverts instead of emitting null under revertWhenEmpty', () => {
    const onCommit = mock((_value: string | null) => undefined)
    render(<EditableText ariaLabel='Título' onCommit={onCommit} revertWhenEmpty value='Contrato' />)

    fireEvent.change(field(), { target: { value: '' } })
    fireEvent.blur(field())

    expect(field().value).toBe('Contrato')
    expect(onCommit).not.toHaveBeenCalled()
  })

  test('clears the stored empty value on focus', () => {
    const onCommit = mock((_value: string | null) => undefined)
    render(
      <EditableText
        ariaLabel='Título'
        emptyValue='Sem título'
        onCommit={onCommit}
        revertWhenEmpty
        value='Sem título'
      />,
    )

    fireEvent.focus(field())

    expect(field().value).toBe('')
  })

  test('lets Escape reach the surrounding dialog only once there is no draft to discard', () => {
    const onCommit = mock((_value: string | null) => undefined)
    // The document listener stands in for the dialog dismissal, which is what the
    // field's `Escape` has to spare while there is a draft.
    const onDialogEscape = mock(() => undefined)
    document.addEventListener('keydown', onDialogEscape)

    try {
      render(<EditableText ariaLabel='Título' onCommit={onCommit} value='Contrato' />)

      field().focus()
      fireEvent.change(field(), { target: { value: 'Rascunho descartado' } })
      fireEvent.keyDown(field(), { key: 'Escape' })

      expect(field().value).toBe('Contrato')
      expect(onDialogEscape).not.toHaveBeenCalled()

      fireEvent.keyDown(field(), { key: 'Escape' })

      expect(onDialogEscape).toHaveBeenCalledTimes(1)
    } finally {
      document.removeEventListener('keydown', onDialogEscape)
    }
  })

  test('does not swallow Escape when only the emptyValue clearing changed the draft', () => {
    const onCommit = mock((_value: string | null) => undefined)
    const onDialogEscape = mock(() => undefined)
    document.addEventListener('keydown', onDialogEscape)

    try {
      render(
        <EditableText
          ariaLabel='Título'
          emptyValue='Sem título'
          onCommit={onCommit}
          revertWhenEmpty
          value='Sem título'
        />,
      )

      // Focusing clears the `emptyValue`; someone who typed nothing has no draft
      // to discard, and the `Escape` has to reach the dialog on the first press.
      fireEvent.focus(field())
      expect(field().value).toBe('')

      fireEvent.keyDown(field(), { key: 'Escape' })

      expect(onDialogEscape).toHaveBeenCalledTimes(1)
      expect(onCommit).not.toHaveBeenCalled()
    } finally {
      document.removeEventListener('keydown', onDialogEscape)
    }
  })

  test('maps each size to its step of the scale', () => {
    const onCommit = mock((_value: string | null) => undefined)
    render(
      <>
        <EditableText ariaLabel='sm' onCommit={onCommit} size='sm' value='a' />
        <EditableText ariaLabel='base' onCommit={onCommit} size='base' value='a' />
        <EditableText ariaLabel='lg' onCommit={onCommit} size='lg' value='a' />
        <EditableText ariaLabel='xl' onCommit={onCommit} size='xl' value='a' />
      </>,
    )

    expect(field('sm').className).toContain('text-sm')
    expect(field('base').className).toContain('text-base')
    expect(field('lg').className).toContain('text-2xl')
    expect(field('xl').className).toContain('text-[2rem]')
  })

  test('renders text instead of a field when read only', () => {
    const onCommit = mock((_value: string | null) => undefined)
    render(
      <EditableText
        ariaLabel='E-mail'
        onCommit={onCommit}
        placeholder='Sem e-mail'
        readOnly
        value={null}
      />,
    )

    expect(screen.queryByLabelText('E-mail')).toBeNull()
    expect(screen.getByText('Sem e-mail')).toBeTruthy()
  })

  test('reads the domain default as a placeholder, not as a written value', () => {
    const onCommit = mock((_value: string | null) => undefined)
    render(
      <EditableText
        ariaLabel='Título'
        emptyValue='Sem título'
        onCommit={onCommit}
        value='Sem título'
      />,
    )

    // `placeholder:text-foreground/40` is always in the class; what changes is the
    // variant-less token, which paints the value itself.
    expect(field().classList.contains('text-foreground/40')).toBe(true)

    fireEvent.change(field(), { target: { value: 'Contrato assinado' } })

    expect(field().classList.contains('text-foreground/40')).toBe(false)
  })
})
