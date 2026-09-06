'use client'

import type * as React from 'react'
import { forwardRef, useCallback } from 'react'
import { Input, type InputProps } from './input'

export type MoneyInputProps = Omit<InputProps, 'value' | 'onChange' | 'type' | 'inputMode'> & {
  /** The amount as a signless integer in the currency's minor unit — never a parsed float. */
  valueMinor: number
  onValueMinorChange: (valueMinor: number) => void
  /** Decimal places the minor unit implies: 2 for most currencies, 0 for one with none. */
  exponent?: number
  locale?: string
}

const formatMinor = (valueMinor: number, exponent: number, locale: string): string =>
  new Intl.NumberFormat(locale, {
    maximumFractionDigits: exponent,
    minimumFractionDigits: exponent,
  }).format(valueMinor / 10 ** exponent)

/**
 * Edits the integer directly: every keystroke appends a digit to the minor
 * unit and the display re-formats from it, so no keystroke ever round-trips
 * through a parsed float. A calculator-style input, not a text field with a
 * currency mask.
 */
export const MoneyInput = forwardRef<HTMLInputElement, MoneyInputProps>(function MoneyInput(
  { exponent = 2, locale = 'pt-BR', onKeyDown, onValueMinorChange, valueMinor, ...props },
  ref,
): React.ReactElement {
  const handleChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const digits = event.target.value.replace(/\D/g, '')
      onValueMinorChange(digits === '' ? 0 : Number(digits.slice(0, 15)))
    },
    [onValueMinorChange],
  )

  const handleKeyDown: NonNullable<InputProps['onKeyDown']> = useCallback(
    (event) => {
      // Backspace drops the integer's last digit: the formatted display has
      // no cursor position that maps meaningfully onto the underlying value.
      if (event.key === 'Backspace') {
        event.preventDefault()
        onValueMinorChange(Math.trunc(valueMinor / 10))
      }
      onKeyDown?.(event)
    },
    [onKeyDown, onValueMinorChange, valueMinor],
  )

  return (
    <Input
      {...props}
      inputMode='numeric'
      onChange={handleChange}
      onKeyDown={handleKeyDown}
      ref={ref}
      value={formatMinor(valueMinor, exponent, locale)}
    />
  )
})
