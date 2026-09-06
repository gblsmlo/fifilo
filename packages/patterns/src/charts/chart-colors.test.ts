import { describe, expect, test } from 'bun:test'

import { chartColorAt, dashPatternAt } from './chart-colors'

describe('chartColorAt', () => {
  test('cycles back to the first hue past the fifth series', () => {
    expect(chartColorAt(0)).toBe(chartColorAt(5))
    expect(chartColorAt(4)).not.toBe(chartColorAt(0))
  })
})

describe('dashPatternAt', () => {
  test('the first series is solid, so a single series never looks dashed', () => {
    expect(dashPatternAt(0)).toBe('0')
  })

  test('a later series gets a different pattern - color is never the only channel', () => {
    expect(dashPatternAt(1)).not.toBe(dashPatternAt(0))
  })
})
