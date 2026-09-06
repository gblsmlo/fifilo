import { describe, expect, test } from 'bun:test'
import { badgeVariants } from './badge'

describe('badgeVariants', () => {
  test('uses the current md visual as its only size', () => {
    const className = badgeVariants()

    expect(className).toContain('h-6')
    expect(className).toContain('min-w-6')
    expect(className).toContain('px-[calc(--spacing(2.5)-1px)]')
    expect(className).toContain('text-sm')
  })

  test('ignores legacy size options', () => {
    const resolveLegacyVariant = badgeVariants as (props?: Record<string, string>) => string

    expect(resolveLegacyVariant({ size: 'md' })).toBe(badgeVariants())
    expect(resolveLegacyVariant({ size: 'lg' })).toBe(badgeVariants())
  })
})
