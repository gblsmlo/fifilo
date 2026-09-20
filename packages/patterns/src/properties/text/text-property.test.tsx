import { afterEach, describe, expect, test } from 'bun:test'

await import('../../test/dom')

const { cleanup, render, screen } = await import('@testing-library/react')
const { TextProperty } = await import('./text-property')

afterEach(cleanup)

describe('TextProperty', () => {
  test('renders a secondary badge for a text value', () => {
    render(<TextProperty ariaLabel='Source' value='Manual' />)

    const badge = screen.getByLabelText('Source: Manual')
    expect(badge.textContent).toContain('Manual')
  })

  test('renders the fallback when value is empty', () => {
    render(<TextProperty fallback='No type' value={null} />)

    expect(screen.getByText('No type')).toBeTruthy()
  })

  test('renders plain text without badge styling', () => {
    render(<TextProperty value='Manual' variant='plain' />)

    expect(screen.getByText('Manual')).toBeTruthy()
  })

  // In a row of empty pills, the generic `+` does not say which is which: with an
  // icon of its own, the icon is what names the property before there is a value.
  test('the empty trigger uses the property icon when it has one', () => {
    const IdIcon = (props: { className?: string }) => (
      <svg data-testid='icone-da-propriedade' {...props} />
    )

    render(
      <TextProperty
        addLabel='Adicionar documento'
        icon={IdIcon}
        onCommit={() => undefined}
        value={null}
      />,
    )

    const trigger = screen.getByRole('button', { name: 'Adicionar documento' })
    expect(trigger.querySelector('[data-testid="icone-da-propriedade"]')).toBeTruthy()
    expect(trigger.querySelector('.lucide-plus')).toBeNull()
  })

  test('with no icon of its own, the empty trigger stays on the `+`', () => {
    render(<TextProperty addLabel='Adicionar origem' onCommit={() => undefined} value={null} />)

    expect(
      screen.getByRole('button', { name: 'Adicionar origem' }).querySelector('.lucide-plus'),
    ).toBeTruthy()
  })
})
