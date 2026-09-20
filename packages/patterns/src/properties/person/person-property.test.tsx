import { afterEach, describe, expect, test } from 'bun:test'

await import('../../test/dom')

const { cleanup, render, screen } = await import('@testing-library/react')
const { PersonProperty } = await import('./person-property')

afterEach(cleanup)

const options = [{ fallback: 'AS', label: 'Ana Souza', value: 'ana' }] as const

// The avatar edge per surface — 20px in the badge, 28px in the plain one — is asserted
// in the `Patterns/Properties/Person` stories, in rendered geometry. What stays here is
// what is not appearance: the accessible label, the suppressed text and the empty state.
describe('PersonProperty', () => {
  test('renders only the avatar while preserving the accessible person label', () => {
    render(
      <PersonProperty
        ariaLabel='Responsável'
        display='avatar'
        options={options}
        readOnly
        value='ana'
        variant='plain'
      />,
    )

    expect(screen.getByLabelText('Responsável: Ana Souza')).toBeTruthy()
    expect(screen.queryByText('Ana Souza')).toBeNull()
  })

  test('keeps an empty avatar visually identifiable when no person is assigned', () => {
    const { container } = render(
      <PersonProperty
        ariaLabel='Responsável'
        display='avatar'
        options={options}
        placeholder='Sem responsável'
        readOnly
        value={null}
        variant='plain'
      />,
    )

    expect(screen.getByLabelText('Responsável: Sem responsável')).toBeTruthy()
    expect(container.querySelector('[data-slot="avatar"]')?.className).toContain('border')
    expect(container.querySelector('.lucide-user')).toBeTruthy()
  })
})
