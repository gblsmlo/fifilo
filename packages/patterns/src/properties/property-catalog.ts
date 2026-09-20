import type React from 'react'

export type PropertyIcon = React.ComponentType<React.SVGProps<SVGSVGElement>>

export type PropertyTone = 'danger' | 'info' | 'neutral' | 'success' | 'warning'

export interface PropertyPreset<TValue extends string> {
  icon: PropertyIcon
  label: string
  tone: PropertyTone
  value: TValue
}

/**
 * The tones come from the theme tokens, not from the fixed palette:
 * `--*-foreground` is `700` in light and `400` in dark, while a literal
 * `text-*-500` stayed the same in both and lost contrast over the light
 * background.
 */
export const propertyToneClassName: Record<PropertyTone, string> = {
  danger: 'text-destructive-foreground',
  info: 'text-info-foreground',
  neutral: 'text-muted-foreground',
  success: 'text-success-foreground',
  warning: 'text-warning-foreground',
}
