import { afterEach, describe, expect, test } from 'bun:test'
import type { PhoneCountryCode } from './countries'

await import('../test/dom')

const { cleanup, render, screen } = await import('@testing-library/react')
const { getCountries } = await import('react-phone-number-input/input-max')
const { phoneCountries } = await import('./countries')
const { PhoneInput } = await import('./phone-input')
const { phoneNumberSchema } = await import('./phone-number')

afterEach(cleanup)

const phoneField = () => screen.getByLabelText('Telefone') as HTMLInputElement

describe('PhoneInput', () => {
  test('shows a saved E.164 number in the national format of its country', () => {
    render(
      <PhoneInput ariaLabel='Telefone' onValueChange={() => undefined} value='+5511987654321' />,
    )

    expect(phoneField().value).toBe('(11) 98765-4321')
  })

  test('takes the country from the number itself, not from the default country', () => {
    render(
      <PhoneInput ariaLabel='Telefone' onValueChange={() => undefined} value='+351912345678' />,
    )

    expect(screen.getByRole('combobox', { name: 'País: Portugal' })).toBeDefined()
    expect(phoneField().value).toBe('912 345 678')
  })

  test('starts on the given default country when there is no number yet', () => {
    render(
      <PhoneInput
        ariaLabel='Telefone'
        defaultCountry='PT'
        onValueChange={() => undefined}
        value={null}
      />,
    )

    expect(screen.getByRole('combobox', { name: 'País: Portugal' })).toBeDefined()
  })

  test('blocks both the number and the country selector while read-only', () => {
    render(
      <PhoneInput
        ariaLabel='Telefone'
        onValueChange={() => undefined}
        readOnly
        value='+5511987654321'
      />,
    )

    const trigger = screen.getByRole('combobox', { name: 'País: Brasil' }) as HTMLButtonElement

    expect(trigger.disabled).toBe(true)
    expect(phoneField().readOnly).toBe(true)
  })

  test('forwards key presses from the number field, not from the country selector', async () => {
    const { fireEvent } = await import('@testing-library/react')
    const keys: string[] = []
    render(
      <PhoneInput
        ariaLabel='Telefone'
        onKeyDown={(event) => keys.push(event.key)}
        onValueChange={() => undefined}
        value='+5511987654321'
      />,
    )

    fireEvent.keyDown(phoneField(), { key: 'Enter' })
    expect(keys).toEqual(['Enter'])

    // The country selector has a keyboard of its own — open the list, search,
    // choose — and forwarding those keys to the consumer would mix two conversations.
    fireEvent.keyDown(screen.getByRole('combobox', { name: 'País: Brasil' }), { key: 'Enter' })
    expect(keys).toEqual(['Enter'])
  })

  test('marks the number as invalid without touching the country selector', () => {
    render(
      <PhoneInput ariaLabel='Telefone' invalid onValueChange={() => undefined} value='+55119876' />,
    )

    expect(phoneField().getAttribute('aria-invalid')).toBe('true')
  })
})

describe('defaultCountry', () => {
  test('refuses at compile time a code that is not ISO 3166-1 alpha-2', () => {
    // @ts-expect-error — if `PhoneCountryCode` loosened to `string`, the
    // typecheck would pass here and this line would fail for lack of an error.
    const invalid: PhoneCountryCode = 'BRA'

    expect(String(invalid)).toBe('BRA')
  })

  test('every country the prop accepts exists in the catalog, with name, code and flag', () => {
    expect(phoneCountries).toHaveLength(getCountries().length)

    const incomplete = phoneCountries
      .filter((country) => !country.name || !country.callingCode || !country.flag)
      .map((country) => country.code)

    expect(incomplete).toEqual([])
  })
})

describe('phoneNumberSchema', () => {
  test('accepts a complete number', () => {
    expect(phoneNumberSchema().safeParse('+5511987654321').success).toBe(true)
  })

  test('rejects a number that is still incomplete', () => {
    const result = phoneNumberSchema().safeParse('+55119876')

    expect(result.success).toBe(false)
    expect(result.error?.issues[0]?.message).toBe('Informe um telefone válido.')
  })

  test('rejects digits that no country accepts, not only short ones', () => {
    expect(phoneNumberSchema().safeParse('+551199999999').success).toBe(false)
  })

  test('reports an empty field with the required message', () => {
    const result = phoneNumberSchema().safeParse('')

    expect(result.success).toBe(false)
    expect(result.error?.issues[0]?.message).toBe('Informe um telefone.')
  })

  test('carries the messages the consumer chose', () => {
    const schema = phoneNumberSchema({
      invalidMessage: 'Número incompleto.',
      requiredMessage: 'Campo obrigatório.',
    })

    expect(schema.safeParse('').error?.issues[0]?.message).toBe('Campo obrigatório.')
    expect(schema.safeParse('+55119876').error?.issues[0]?.message).toBe('Número incompleto.')
  })
})
