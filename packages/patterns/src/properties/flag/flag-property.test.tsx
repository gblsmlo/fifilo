import { afterEach, describe, expect, test } from 'bun:test'

await import('../../test/dom')

const { cleanup, render, screen } = await import('@testing-library/react')
const { FlagProperty } = await import('./flag-property')

afterEach(cleanup)

describe('FlagProperty', () => {
  test('renders an active secondary flag badge', () => {
    render(<FlagProperty active ariaLabel='Automatic' label='Automatic' />)

    const badge = screen.getByLabelText('Automatic: Automatic')
    expect(badge.textContent).toContain('Automatic')
  })

  test('hides inactive flags by default', () => {
    render(<FlagProperty active={false} label='Overdue' />)

    expect(screen.queryByText('Overdue')).toBeNull()
  })

  test('renders inactive flags when requested', () => {
    render(<FlagProperty active={false} inactiveLabel='On time' label='Overdue' showInactive />)

    expect(screen.getByText('On time')).toBeTruthy()
  })

  test('renders a plain flag without badge styling', () => {
    render(<FlagProperty active label='Automatic' variant='plain' />)

    expect(screen.getByText('Automatic')).toBeTruthy()
  })
})
