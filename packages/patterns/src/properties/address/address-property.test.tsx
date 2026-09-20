import { afterEach, describe, expect, test } from 'bun:test'

await import('../../test/dom')

const { cleanup, render, screen } = await import('@testing-library/react')
const { AddressProperty, addressSummary } = await import('./address-property')
type AddressValue = import('./address-property').AddressValue

const address: AddressValue = {
  city: 'Fortaleza',
  complement: null,
  district: 'Aldeota',
  number: '1200',
  postalCode: '60150-160',
  state: 'CE',
  street: 'Avenida Dom Luís',
}

afterEach(cleanup)

describe('AddressProperty', () => {
  test('the summary is city and state', () => {
    expect(addressSummary(address)).toBe('Fortaleza, CE')
    expect(addressSummary({ ...address, state: null })).toBe('Fortaleza')
  })

  test('sem cidade, o resumo cai para a primeira parte preenchida', () => {
    const noCity = { ...address, city: null }

    expect(addressSummary(noCity)).toBe('Avenida Dom Luís')
    expect(addressSummary({ ...noCity, street: null })).toBe('Aldeota')
    expect(addressSummary({ ...noCity, district: null, street: null })).toBe('60150-160')
  })

  test('an absent address has no summary', () => {
    expect(addressSummary(null)).toBeNull()
    expect(
      addressSummary({
        city: null,
        complement: null,
        district: null,
        number: null,
        postalCode: null,
        state: null,
        street: null,
      }),
    ).toBeNull()
  })

  test('the row reads the summary, and with no address states the absence', () => {
    render(<AddressProperty value={address} />)
    expect(screen.getByText('Fortaleza, CE')).toBeTruthy()

    cleanup()
    render(<AddressProperty placeholder='Sem localização' value={null} />)
    expect(screen.getByText('Sem localização')).toBeTruthy()
  })

  test('with no writing, the row offers no trigger', () => {
    render(<AddressProperty value={address} />)

    expect(screen.queryByRole('button')).toBeNull()
  })

  test('with writing, the value becomes a trigger that names the address', () => {
    render(<AddressProperty onValueChange={() => undefined} value={address} />)

    expect(screen.getByRole('button', { name: 'Endereço: Fortaleza, CE' })).toBeTruthy()
  })

  test('vazia e com escrita, o gatilho se explica', () => {
    render(<AddressProperty onValueChange={() => undefined} value={null} />)

    expect(screen.getByRole('button', { name: 'Adicionar endereço' })).toBeTruthy()
  })
})
