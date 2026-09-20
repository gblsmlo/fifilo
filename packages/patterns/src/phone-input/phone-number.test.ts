import { describe, expect, test } from 'bun:test'
import { formatPhoneNumber } from './phone-number'

describe('formatPhoneNumber', () => {
  test('a Brazilian number reads in national format, with a period in the subscriber part', () => {
    expect(formatPhoneNumber('+5585999013364')).toBe('(85) 99901.3364')
    expect(formatPhoneNumber('+5511987654321')).toBe('(11) 98765.4321')
  })

  test('outside Brazil the country code stays in sight', () => {
    expect(formatPhoneNumber('+12125551234')).toBe('+1 212 555 1234')
  })

  test('what is not a phone comes back unchanged', () => {
    expect(formatPhoneNumber(null)).toBe('')
    expect(formatPhoneNumber('12345')).toBe('12345')
  })
})
