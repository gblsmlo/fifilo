import { afterEach, describe, expect, mock, test } from 'bun:test'

await import('../../test/dom')

const { act, cleanup, fireEvent, render, screen } = await import('@testing-library/react')
const { EmailProperty } = await import('./email-property')

afterEach(cleanup)

const EMAIL = 'ana@fifilo.test'
const OTHER = 'bruno@fifilo.test'

const openAddPopover = async (name: string) => {
  await act(async () => fireEvent.click(screen.getByRole('button', { name })))
}

const fillEntry = async (label: string, email: string) => {
  const field = await screen.findByRole('textbox', { name: label })
  await act(async () => fireEvent.change(field, { target: { value: email } }))
  return field
}

const addAnother = async () => {
  await act(async () => fireEvent.click(screen.getByRole('button', { name: 'Adicionar outro' })))
}

const save = async () => {
  await act(async () => fireEvent.click(screen.getByRole('button', { name: 'Salvar' })))
}

describe('EmailProperty', () => {
  test('empty, the row reads as an absent property and the trigger names itself', () => {
    render(<EmailProperty action={() => undefined} value={[]} />)

    const trigger = screen.getByRole('button', { name: 'Adicionar e-mail' })
    expect(trigger.textContent).toContain('Sem e-mail')
    expect(trigger.className).toContain('text-muted-foreground')
  })

  test('com e-mail, o gatilho colapsa no sinal de adicionar', () => {
    render(<EmailProperty action={() => undefined} value={[EMAIL]} />)

    const trigger = screen.getByRole('button', { name: 'Adicionar e-mail' })
    expect(trigger.textContent).toBe('')
    expect(trigger.querySelector('svg')).toBeTruthy()
  })

  test('the popup opens with what already exists and adds the second address', async () => {
    const action = mock(() => undefined)
    render(<EmailProperty action={action} value={[EMAIL]} />)

    await openAddPopover('Adicionar e-mail')
    expect((screen.getByRole('textbox', { name: 'Principal' }) as HTMLInputElement).value).toBe(
      EMAIL,
    )

    await addAnother()
    await fillEntry('Secundário', OTHER)
    await save()

    expect(action).toHaveBeenCalledWith([EMAIL, OTHER], {
      added: OTHER,
      previousValue: [EMAIL],
      removed: null,
    })
  })

  test('adding the second one only unlocks with the first one valid', async () => {
    render(<EmailProperty action={() => undefined} value={[]} />)

    await openAddPopover('Adicionar e-mail')
    const another = screen.getByRole('button', { name: 'Adicionar outro' })
    // Blank, there is nothing to add…
    expect(another.hasAttribute('disabled')).toBe(true)

    await fillEntry('Principal', 'ana@')
    // …e incompleto ainda vai mudar.
    expect(screen.getByRole('button', { name: 'Adicionar outro' }).hasAttribute('disabled')).toBe(
      true,
    )

    await fillEntry('Principal', EMAIL)
    expect(screen.getByRole('button', { name: 'Adicionar outro' }).hasAttribute('disabled')).toBe(
      false,
    )
  })

  test('with the declared entries filled, there is no other to add', async () => {
    render(<EmailProperty action={() => undefined} value={[EMAIL, OTHER]} />)

    await openAddPopover('Adicionar e-mail')

    expect(screen.getByRole('button', { name: 'Adicionar outro' }).hasAttribute('disabled')).toBe(
      true,
    )
  })

  test('Enter no campo salva, sem o popup fechar por baixo', async () => {
    const action = mock(() => undefined)
    render(<EmailProperty action={action} value={[]} />)

    await openAddPopover('Adicionar e-mail')
    const field = await fillEntry('Principal', OTHER)
    await act(async () => fireEvent.keyDown(field, { key: 'Enter' }))

    expect(action).toHaveBeenCalledWith([OTHER], {
      added: OTHER,
      previousValue: [],
      removed: null,
    })
  })

  test('an invalid format is refused in the field itself', async () => {
    const action = mock(() => undefined)
    render(<EmailProperty action={action} value={[]} />)

    await openAddPopover('Adicionar e-mail')
    await fillEntry('Principal', 'ana@')
    await save()

    expect(action).toHaveBeenCalledTimes(0)
    expect((await screen.findByRole('alert')).textContent).toBe('Informe um e-mail válido.')
  })

  test('a repeated address does not become a duplicate chip', async () => {
    const action = mock(() => undefined)
    render(<EmailProperty action={action} value={[EMAIL]} />)

    await openAddPopover('Adicionar e-mail')
    await addAnother()
    await fillEntry('Secundário', EMAIL)
    await save()

    expect(action).toHaveBeenCalledTimes(0)
    expect((await screen.findByRole('alert')).textContent).toBe('Este e-mail já está na lista.')
  })

  test('removing returns the list without the address, naming which one left', async () => {
    const action = mock(() => undefined)
    render(<EmailProperty action={action} value={[EMAIL, OTHER]} />)

    await act(async () =>
      fireEvent.click(screen.getByRole('button', { name: `Remover e-mail ${EMAIL}` })),
    )

    expect(action).toHaveBeenCalledWith([OTHER], {
      added: null,
      previousValue: [EMAIL, OTHER],
      removed: EMAIL,
    })
  })

  test('no modo inline o gatilho vira campo no lugar, sem popup', async () => {
    const action = mock(() => undefined)
    render(<EmailProperty action={action} editing='inline' value={[]} />)

    await act(async () => fireEvent.click(screen.getByRole('button', { name: 'Adicionar e-mail' })))

    const field = screen.getByRole('textbox', { name: 'Adicionar e-mail' })
    expect(field.getAttribute('data-slot')).toBe('editable-text')
    expect(screen.queryByRole('dialog')).toBeNull()

    await act(async () => {
      fireEvent.focus(field)
      fireEvent.change(field, { target: { value: OTHER } })
      fireEvent.blur(field)
    })

    expect(action).toHaveBeenCalledWith([OTHER], {
      added: OTHER,
      previousValue: [],
      removed: null,
    })
  })

  test('in the inline shape, a refused format keeps the field open with the message', async () => {
    const action = mock(() => undefined)
    render(<EmailProperty action={action} editing='inline' value={[]} />)

    await act(async () => fireEvent.click(screen.getByRole('button', { name: 'Adicionar e-mail' })))
    const field = screen.getByRole('textbox', { name: 'Adicionar e-mail' })
    await act(async () => {
      fireEvent.focus(field)
      fireEvent.change(field, { target: { value: 'ana@' } })
      fireEvent.blur(field)
    })

    expect(action).toHaveBeenCalledTimes(0)
    expect(screen.getByRole('alert').textContent).toBe('Informe um e-mail válido.')
    // The draft stays in the field: correcting cannot require typing it again.
    expect(
      (screen.getByRole('textbox', { name: 'Adicionar e-mail' }) as HTMLInputElement).value,
    ).toBe('ana@')
  })

  test('no arranjo `trigger`, o gatilho segue nomeando a propriedade preenchida', async () => {
    render(<EmailProperty action={() => undefined} display='trigger' value={[EMAIL, OTHER]} />)

    // Side by side with another row, two identical `+` do not say which one they belong to:
    // here the trigger keeps showing the value, and `+1` counts the rest.
    const trigger = screen.getByRole('button', { name: /E-mails: / })
    expect(trigger.textContent).toContain('+1')
    expect(screen.queryByRole('button', { name: 'Adicionar e-mail' })).toBeNull()

    await act(async () => fireEvent.click(trigger))
    expect(await screen.findByRole('textbox', { name: 'Principal' })).toBeTruthy()
  })

  test('read-only shows the addresses with no path to editing', () => {
    render(<EmailProperty readOnly value={[EMAIL]} />)

    expect(screen.queryByRole('button', { name: 'Adicionar e-mail' })).toBeNull()
    expect(screen.getByText(EMAIL)).toBeTruthy()
  })
})
