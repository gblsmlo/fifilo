import { afterEach, describe, expect, mock, test } from 'bun:test'

await import('../../test/dom')

const { act, cleanup, fireEvent, render, screen } = await import('@testing-library/react')
const { PhoneProperty } = await import('./phone-property')

afterEach(cleanup)

const PHONE = '+5511987654321'
const OTHER = '+5511912345678'
// What the row shows: the stored number is E.164, and the reader sees the national one.
const PHONE_SHOWN = '(11) 98765.4321'

const openAddPopover = async (name: string) => {
  await act(async () => fireEvent.click(screen.getByRole('button', { name })))
}

const fillEntry = async (label: string, phone: string) => {
  const field = await screen.findByRole('textbox', { name: label })
  await act(async () => fireEvent.change(field, { target: { value: phone } }))
  return field
}

const save = async () => {
  await act(async () => fireEvent.click(screen.getByRole('button', { name: 'Salvar' })))
}

describe('PhoneProperty', () => {
  test('saving does not submit the form that composes the property', async () => {
    const onSubmit = mock((event: { preventDefault: () => void }) => event.preventDefault())
    const onValueChange = mock(() => undefined)
    render(
      // The popup is a portal: without containing the submit, it bubbles through
      // the React tree up to the form that composes the row, and saving a phone
      // becomes creating the whole record.
      <form onSubmit={onSubmit}>
        <PhoneProperty onValueChange={onValueChange} value={[]} />
      </form>,
    )

    await openAddPopover('Adicionar telefone')
    await fillEntry('Principal', PHONE)
    await save()

    expect(onValueChange).toHaveBeenCalledWith([PHONE])
    expect(onSubmit).toHaveBeenCalledTimes(0)
  })

  test('empty, the row reads as an absent property and the trigger names itself', () => {
    render(<PhoneProperty action={() => undefined} value={[]} />)

    // The text is the state — "Sem telefone", like the other empty properties —
    // and what the trigger does lives in the accessible name.
    const trigger = screen.getByRole('button', { name: 'Adicionar telefone' })
    expect(trigger.textContent).toContain('Sem telefone')
    expect(trigger.className).toContain('text-muted-foreground')
  })

  test('com telefone, o gatilho colapsa no sinal de adicionar', () => {
    render(<PhoneProperty action={() => undefined} value={[PHONE]} />)

    const trigger = screen.getByRole('button', { name: 'Adicionar telefone' })
    // The label leaves the text and becomes the accessible name: the context is
    // already given by the chips next to it, and repeating the word per number
    // would be noise.
    expect(trigger.textContent).toBe('')
    expect(trigger.querySelector('svg')).toBeTruthy()
  })

  test('the popup opens with what already exists and adds the second number', async () => {
    const action = mock(() => undefined)
    render(<PhoneProperty action={action} value={[PHONE]} />)

    await openAddPopover('Adicionar telefone')
    // The primary one comes in already filled: the popup edits the list, not a loose number.
    expect(
      (screen.getByRole('textbox', { name: 'Principal' }) as HTMLInputElement).value,
    ).toContain('98765-4321')

    await act(async () => fireEvent.click(screen.getByRole('button', { name: 'Adicionar outro' })))
    await fillEntry('Secundário', OTHER)
    await save()

    expect(action).toHaveBeenCalledWith([PHONE, OTHER], {
      added: OTHER,
      previousValue: [PHONE],
      removed: null,
    })
  })

  test('adding the second one only unlocks with the first one valid', async () => {
    render(<PhoneProperty action={() => undefined} value={[]} />)

    await openAddPopover('Adicionar telefone')
    const another = screen.getByRole('button', { name: 'Adicionar outro' })
    // Blank, there is nothing to add…
    expect(another.hasAttribute('disabled')).toBe(true)

    await fillEntry('Principal', '+55119876')
    // …e incompleto ainda vai mudar.
    expect(screen.getByRole('button', { name: 'Adicionar outro' }).hasAttribute('disabled')).toBe(
      true,
    )

    await fillEntry('Principal', PHONE)
    expect(screen.getByRole('button', { name: 'Adicionar outro' }).hasAttribute('disabled')).toBe(
      false,
    )
  })

  test('with the declared entries filled, there is no other to add', async () => {
    render(<PhoneProperty action={() => undefined} value={[PHONE, OTHER]} />)

    await openAddPopover('Adicionar telefone')

    expect(screen.getByRole('button', { name: 'Adicionar outro' }).hasAttribute('disabled')).toBe(
      true,
    )
  })

  test('a repeated number does not become a duplicate chip', async () => {
    const action = mock(() => undefined)
    render(<PhoneProperty action={action} value={[PHONE]} />)

    await openAddPopover('Adicionar telefone')
    await act(async () => fireEvent.click(screen.getByRole('button', { name: 'Adicionar outro' })))
    await fillEntry('Secundário', PHONE)
    await save()

    expect(action).toHaveBeenCalledTimes(0)
    expect((await screen.findByRole('alert')).textContent).toBe('Este telefone já está na lista.')
  })

  test('removing returns the list without the number, naming which one left', async () => {
    const action = mock(() => undefined)
    render(<PhoneProperty action={action} value={[PHONE, OTHER]} />)

    await act(async () =>
      fireEvent.click(screen.getByRole('button', { name: `Remover telefone ${PHONE_SHOWN}` })),
    )

    expect(action).toHaveBeenCalledWith([OTHER], {
      added: null,
      previousValue: [PHONE, OTHER],
      removed: PHONE,
    })
  })

  test('the consumer refusal shows up in the form', async () => {
    render(
      <PhoneProperty
        action={() => undefined}
        errorMessage='Já existe outro contato com este telefone.'
        value={[]}
      />,
    )

    await openAddPopover('Adicionar telefone')
    expect((await screen.findByRole('alert')).textContent).toBe(
      'Já existe outro contato com este telefone.',
    )
  })

  test('an incomplete number is refused in the field, never reaching the consumer', async () => {
    const action = mock(() => undefined)
    render(<PhoneProperty action={action} value={[]} />)

    await openAddPopover('Adicionar telefone')
    const field = await fillEntry('Principal', '+55119876')
    await save()

    // The library that formats knows the number is incomplete; sending the
    // server what is already known to be invalid would be a needless round trip.
    expect(action).toHaveBeenCalledTimes(0)
    expect((await screen.findByRole('alert')).textContent).toBe('Informe um telefone válido.')
    expect(field.getAttribute('aria-invalid')).toBe('true')
  })

  test('a number in national format comes out as E.164', async () => {
    const action = mock(() => undefined)
    render(<PhoneProperty action={action} value={[]} />)

    await openAddPopover('Adicionar telefone')
    // Typed as it reads in Brazil; the value that comes out is what the contract holds.
    await fillEntry('Principal', '(11) 98765-4321')
    await save()

    expect(action).toHaveBeenCalledWith(['+5511987654321'], {
      added: '+5511987654321',
      previousValue: [],
      removed: null,
    })
  })

  test('no arranjo `trigger`, o gatilho segue nomeando a propriedade preenchida', async () => {
    render(<PhoneProperty action={() => undefined} display='trigger' value={[PHONE, OTHER]} />)

    // Side by side with another row, two identical `+` do not say which one they belong to:
    // here the trigger keeps showing the value, and `+1` counts the rest.
    const trigger = screen.getByRole('button', { name: /Telefones: / })
    expect(trigger.textContent).toContain('+1')
    expect(screen.queryByRole('button', { name: 'Adicionar telefone' })).toBeNull()

    await act(async () => fireEvent.click(trigger))
    expect(await screen.findByRole('textbox', { name: 'Principal' })).toBeTruthy()
  })

  test('with no action, the row is read-only — neither adding nor removing', () => {
    render(<PhoneProperty value={[PHONE]} />)

    expect(screen.queryByRole('button')).toBeNull()
    expect(screen.getByText(PHONE_SHOWN)).toBeTruthy()
  })

  test('no arranjo `trigger`, o gatilho segue nomeando a propriedade preenchida', async () => {
    render(<PhoneProperty action={() => undefined} display='trigger' value={[PHONE, OTHER]} />)

    // Side by side with another row, two identical `+` do not say which one they belong to:
    // here the trigger keeps showing the value, and `+1` counts the rest.
    const trigger = screen.getByRole('button', { name: /Telefones: / })
    expect(trigger.textContent).toContain('+1')
    expect(screen.queryByRole('button', { name: 'Adicionar telefone' })).toBeNull()

    await act(async () => fireEvent.click(trigger))
    expect(await screen.findByRole('textbox', { name: 'Principal' })).toBeTruthy()
  })

  test('read-only and empty, it states the absence instead of going blank', () => {
    render(<PhoneProperty value={[]} />)

    expect(screen.getByText('Sem telefone')).toBeTruthy()
  })

  test('`addDisabled` closes only the path to adding; removing stays', () => {
    const action = mock(() => undefined)
    render(<PhoneProperty action={action} addDisabled value={[PHONE]} />)

    // The contract that holds a single number has no second one to add, but the
    // existing number stays removable.
    expect(screen.queryByRole('button', { name: 'Adicionar telefone' })).toBeNull()
    expect(screen.getByRole('button', { name: `Remover telefone ${PHONE_SHOWN}` })).toBeTruthy()
  })

  test('Enter no campo salva sem exigir o mouse', async () => {
    const action = mock(() => undefined)
    render(<PhoneProperty action={action} value={[]} />)

    await openAddPopover('Adicionar telefone')
    const field = await fillEntry('Principal', PHONE)
    await act(async () => fireEvent.keyDown(field, { key: 'Enter' }))

    expect(action).toHaveBeenCalledWith([PHONE], {
      added: PHONE,
      previousValue: [],
      removed: null,
    })
  })
})
