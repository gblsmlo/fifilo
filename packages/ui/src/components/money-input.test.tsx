import { afterEach, describe, expect, test } from 'bun:test'

await import('../test/dom')

const { cleanup, render, screen, fireEvent } = await import('@testing-library/react')
const { MoneyInput } = await import('./money-input')

afterEach(cleanup)

const inputValue = (): string => (screen.getByRole('textbox') as HTMLInputElement).value

describe('MoneyInput', () => {
  test('formats the minor-unit value as a decimal amount', () => {
    render(<MoneyInput onValueMinorChange={() => {}} valueMinor={12_345} />)

    expect(inputValue()).toBe('123,45')
  })

  test('typing digits appends to the integer, never parses the displayed text', () => {
    let valueMinor = 0
    const handleChange = (next: number) => {
      valueMinor = next
    }
    const { rerender } = render(
      <MoneyInput onValueMinorChange={handleChange} valueMinor={valueMinor} />,
    )

    fireEvent.change(screen.getByRole('textbox'), { target: { value: '5' } })
    expect(valueMinor).toBe(5)

    rerender(<MoneyInput onValueMinorChange={handleChange} valueMinor={valueMinor} />)
    expect(inputValue()).toBe('0,05')
  })

  test('ignores non-digit characters typed into the field', () => {
    let valueMinor = 100
    const handleChange = (next: number) => {
      valueMinor = next
    }
    render(<MoneyInput onValueMinorChange={handleChange} valueMinor={valueMinor} />)

    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'R$1abc,00' } })
    expect(valueMinor).toBe(100)
  })

  test('backspace drops the last digit of the integer', () => {
    let valueMinor = 12_345
    const handleChange = (next: number) => {
      valueMinor = next
    }
    render(<MoneyInput onValueMinorChange={handleChange} valueMinor={valueMinor} />)

    fireEvent.keyDown(screen.getByRole('textbox'), { key: 'Backspace' })
    expect(valueMinor).toBe(1_234)
  })

  test('supports a zero-decimal exponent', () => {
    render(<MoneyInput exponent={0} onValueMinorChange={() => {}} valueMinor={500} />)

    expect(inputValue()).toBe('500')
  })
})
