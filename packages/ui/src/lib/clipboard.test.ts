import { afterEach, describe, expect, mock, test } from 'bun:test'

import { copyToClipboard } from './clipboard'

const originalClipboard = navigator.clipboard

afterEach(() => {
  Object.defineProperty(navigator, 'clipboard', {
    configurable: true,
    value: originalClipboard,
  })
})

describe('copyToClipboard', () => {
  test('writes the provided value through the Clipboard API', () => {
    const writeText = mock((value: string) => Promise.resolve(value))

    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText },
    })

    expect(copyToClipboard('hello')).toBeInstanceOf(Promise)
    expect(writeText).toHaveBeenCalledTimes(1)
    expect(writeText).toHaveBeenCalledWith('hello')
  })

  test('does nothing when clipboard is unavailable', () => {
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: undefined,
    })

    expect(copyToClipboard('hello')).toBeUndefined()
  })
})
