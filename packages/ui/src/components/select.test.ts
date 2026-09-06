import { describe, expect, test } from 'bun:test'

import { selectTriggerVariants } from './select'

describe('selectTriggerVariants', () => {
  test('uses one visual size even when a legacy size option is passed', () => {
    const resolveLegacyVariant = selectTriggerVariants as (props?: Record<string, string>) => string

    expect(resolveLegacyVariant({ size: 'sm' })).toBe(selectTriggerVariants())
    expect(resolveLegacyVariant({ size: 'lg' })).toBe(selectTriggerVariants())
  })

  test('does not add shadow styling to the trigger', () => {
    expect(selectTriggerVariants()).not.toContain('shadow')
  })
})
