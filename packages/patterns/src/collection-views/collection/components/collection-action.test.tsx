import { afterEach, describe, expect, mock, test } from 'bun:test'
import type React from 'react'

await import('../../../test/dom')

const { cleanup, fireEvent, render, screen } = await import('@testing-library/react')
const { Toolbar } = await import('@fifilo/ui/components/toolbar')
const { Action } = await import('./collection-action')

afterEach(cleanup)

/** `Action` is part of a toolbar: outside `Toolbar.Root` Base UI does not even mount. */
const renderInToolbar = (element: React.ReactElement) => render(<Toolbar>{element}</Toolbar>)

describe('Action', () => {
  test('the action names what it does and returns the click', () => {
    const onClick = mock(() => undefined)
    renderInToolbar(<Action label='Nova empresa' onClick={onClick} />)

    fireEvent.click(screen.getByRole('button', { name: 'Nova empresa' }))
    expect(onClick).toHaveBeenCalledTimes(1)
  })

  test('desabilitada, recusa o clique e continua no foco rotativo da toolbar', () => {
    const onClick = mock(() => undefined)
    renderInToolbar(<Action disabled label='Nova empresa' onClick={onClick} />)

    const action = screen.getByRole('button', { name: 'Nova empresa' })
    expect(action.getAttribute('aria-disabled')).toBe('true')

    fireEvent.click(action)
    expect(onClick).toHaveBeenCalledTimes(0)
  })

  test('disabled, the refusal is visible as well, not only announced', () => {
    renderInToolbar(<Action disabled label='Nova empresa' onClick={() => undefined} />)

    // Base UI drops the native `disabled` to keep the button focusable, so
    // Tailwind's `disabled:` never matches: without a class of its own, the
    // refused action still looks like one that takes the click.
    const action = screen.getByRole('button', { name: 'Nova empresa' })
    expect(action.matches(':disabled')).toBe(false)
    expect(action.className).toContain('opacity-64')
    expect(action.className).toContain('cursor-not-allowed')
  })

  test('the explanation of the refusal travels on the control itself', () => {
    renderInToolbar(
      <Action
        disabled
        label='Nova empresa'
        onClick={() => undefined}
        title='Somente quem cadastra vê esta ação ativa.'
      />,
    )

    expect(screen.getByRole('button', { name: 'Nova empresa' }).getAttribute('title')).toBe(
      'Somente quem cadastra vê esta ação ativa.',
    )
  })
})
