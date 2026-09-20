import { afterEach, describe, expect, test } from 'bun:test'

await import('../../test/dom')

const { cleanup, fireEvent, render, screen } = await import('@testing-library/react')
const { AttachmentsProperty } = await import('./attachments-property')
const { AttachmentProperty } = await import('./attachment-property')

afterEach(cleanup)

describe('AttachmentsProperty absence contract', () => {
  test('claims data-empty only while the row holds no attachment', () => {
    const action = { label: 'Anexar arquivo', onSelect: () => undefined }
    const { rerender } = render(<AttachmentsProperty action={action} ariaLabel='Arquivos' />)
    expect(screen.getByRole('button', { name: 'Anexar arquivo' }).getAttribute('data-empty')).toBe(
      'true',
    )

    rerender(
      <AttachmentsProperty action={action} ariaLabel='Arquivos'>
        <AttachmentProperty href='#contrato' label='Contrato.pdf' type='pdf' />
      </AttachmentsProperty>,
    )
    expect(
      screen.getByRole('button', { name: 'Anexar arquivo' }).getAttribute('data-empty'),
    ).toBeNull()
  })
})

describe('AttachmentProperty', () => {
  test('only offers removal when the consumer passes it', () => {
    const removed: string[] = []
    const { rerender } = render(
      <AttachmentProperty href='#contrato' label='Contrato.pdf' type='pdf' />,
    )
    expect(screen.queryByRole('button', { name: /Remover/ })).toBeNull()

    rerender(
      <AttachmentProperty
        href='#contrato'
        label='Contrato.pdf'
        onRemove={() => removed.push('contrato')}
        removeLabel='Remover Contrato.pdf'
        type='pdf'
      />,
    )
    const remove = screen.getByRole('button', { name: 'Remover Contrato.pdf' })
    // Sibling of the link, not child: a button inside an anchor would be invalid markup.
    expect(remove.closest('a')).toBeNull()

    fireEvent.click(remove)
    expect(removed).toEqual(['contrato'])
  })

  test('draws the type on the left and nothing but removal on the right', () => {
    render(
      <>
        <AttachmentProperty
          action='download'
          href='#proposta'
          label='Proposta comercial.pdf'
          onRemove={() => undefined}
          removeLabel='Remover Proposta comercial.pdf'
          type='pdf'
        />
        <AttachmentProperty
          href='#gravacao'
          label='Gravação da reunião'
          onRemove={() => undefined}
          removeLabel='Remover Gravação da reunião'
          type='link'
        />
      </>,
    )

    const download = screen.getByRole('link', { name: 'Proposta comercial.pdf' })
    const anchor = screen.getByRole('link', { name: 'Gravação da reunião' })

    expect(download.getAttribute('data-slot')).toBe('attachment-property-link')
    expect(download.hasAttribute('download')).toBe(true)
    expect(anchor.hasAttribute('download')).toBe(false)
    expect(
      download
        .closest('[data-slot="attachment-property"]')
        ?.querySelector('[data-slot="attachment-type-icon"]')
        ?.getAttribute('data-attachment-type'),
    ).toBe('pdf')

    // `anchor` and `download` decide how the destination opens, not the
    // affordance on the right: both chips end in the same `×`.
    for (const chip of screen.getAllByRole('link')) {
      const surface = chip.closest('[data-slot="attachment-property"]')
      expect(surface?.querySelectorAll('[data-slot="attachment-property-remove"]')).toHaveLength(1)
    }
  })
})

describe('AttachmentsProperty', () => {
  test('lists the attachments it receives', () => {
    render(
      <AttachmentsProperty ariaLabel='Arquivos'>
        <AttachmentProperty href='#contrato' label='Contrato.pdf' type='pdf' />
      </AttachmentsProperty>,
    )

    expect(screen.getByText('Contrato.pdf')).toBeTruthy()
  })

  test('keeps the add action visible without a menu to open', () => {
    render(
      <AttachmentsProperty
        action={{ label: 'Anexar arquivo', onSelect: () => undefined }}
        ariaLabel='Arquivos'
      />,
    )

    // No `…`: in an empty row the command is the only affordance, and hiding it
    // would leave the initial state with no way in.
    expect(screen.getByRole('button', { name: 'Anexar arquivo' })).toBeTruthy()
    expect(screen.queryByRole('menu')).toBeNull()
  })

  test('runs the action on the first click', () => {
    const chosen: string[] = []
    render(
      <AttachmentsProperty
        action={{ label: 'Adicionar link', onSelect: () => chosen.push('link') }}
        ariaLabel='Links'
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Adicionar link' }))

    expect(chosen).toEqual(['link'])
  })

  test('hides the action when the row is read-only', () => {
    render(
      <AttachmentsProperty ariaLabel='Arquivos'>
        <AttachmentProperty href='#contrato' label='Contrato.pdf' type='pdf' />
      </AttachmentsProperty>,
    )

    expect(screen.queryByRole('button')).toBeNull()
  })

  test('names the action by extenso when the row is empty', () => {
    render(
      <AttachmentsProperty
        action={{ label: 'Anexar arquivo', onSelect: () => undefined }}
        ariaLabel='Arquivos'
      />,
    )

    // A lone `+` does not say what it adds; with no attachments the name has to show.
    expect(screen.getByText('Anexar arquivo')).toBeTruthy()
  })

  test('collapses to a single sign once the row carries attachments', () => {
    render(
      <AttachmentsProperty
        action={{ label: 'Anexar arquivo', onSelect: () => undefined }}
        ariaLabel='Arquivos'
      >
        <AttachmentProperty href='#contrato' label='Contrato.pdf' type='pdf' />
      </AttachmentsProperty>,
    )

    expect(screen.queryByText('Anexar arquivo')).toBeNull()
    // The name leaves the visible text but stays in the accessible label — and there is
    // a single trigger, like the `+` of TagsProperty. Two identical `+` would not say which is which.
    expect(screen.getAllByRole('button', { name: 'Anexar arquivo' })).toHaveLength(1)
  })

  test('does not run a disabled action', () => {
    const chosen: string[] = []
    render(
      <AttachmentsProperty
        action={{ disabled: true, label: 'Enviando…', onSelect: () => chosen.push('file') }}
        ariaLabel='Arquivos'
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Enviando…' }))

    expect(chosen).toEqual([])
  })
})
