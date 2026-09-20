import { afterEach, describe, expect, test } from 'bun:test'
import { CircleIcon } from 'lucide-react'

await import('../../test/dom')

const { cleanup, render, screen } = await import('@testing-library/react')
const { IconLabelProperty } = await import('./icon-label-property')

afterEach(cleanup)

describe('IconLabelProperty', () => {
  test('renders the label as a secondary badge', () => {
    render(<IconLabelProperty ariaLabel='Origem' label='Manual' />)

    const badge = screen.getByLabelText('Origem: Manual')
    expect(badge.textContent).toContain('Manual')
  })

  test('renders without an icon when none is given', () => {
    render(<IconLabelProperty label='Manual' />)

    expect(document.querySelector('svg')).toBeNull()
  })

  test('renders the icon when given', () => {
    render(<IconLabelProperty icon={CircleIcon} label='Manual' />)

    expect(document.querySelector('svg[aria-hidden="true"]')).toBeTruthy()
  })

  test('renders plain text without badge styling', () => {
    render(<IconLabelProperty label='Manual' variant='plain' />)

    expect(screen.getByText('Manual')).toBeTruthy()
  })
})
