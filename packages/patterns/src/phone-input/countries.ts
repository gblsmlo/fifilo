import flags from 'react-phone-number-input/flags'
import type { Country } from 'react-phone-number-input/input-max'
import { getCountries, getCountryCallingCode } from 'react-phone-number-input/input-max'
import countryNames from 'react-phone-number-input/locale/pt-BR.json'

export type PhoneCountryCode = Country

export interface PhoneCountry {
  /** Dialing code without the `+`, such as `55`. */
  callingCode: string
  code: PhoneCountryCode
  flag: NonNullable<(typeof flags)[Country]> | undefined
  name: string
}

const toPhoneCountry = (code: PhoneCountryCode): PhoneCountry => ({
  callingCode: getCountryCallingCode(code),
  code,
  flag: flags[code],
  name: countryNames[code],
})

const byName = new Intl.Collator('pt-BR')

export const phoneCountries: readonly PhoneCountry[] = getCountries()
  .map(toPhoneCountry)
  .sort((first, second) => byName.compare(first.name, second.name))

const byCode = new Map(phoneCountries.map((country) => [country.code, country]))

export function findPhoneCountry(code: PhoneCountryCode): PhoneCountry {
  return byCode.get(code) ?? toPhoneCountry(code)
}
