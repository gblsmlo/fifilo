import { isValidPhoneNumber, parsePhoneNumber } from 'react-phone-number-input/input-max'
import { z } from 'zod'
import type { PhoneCountryCode } from './countries'

export const defaultPhoneCountry: PhoneCountryCode = 'BR'

/**
 * The country the number already belongs to. It holds for an incomplete number:
 * `+551198` already identifies Brazil, and that is what keeps the flag coherent
 * with what is written while the person types.
 */
export function phoneNumberCountry(value: string | null): PhoneCountryCode | undefined {
  if (!value) return undefined
  return parsePhoneNumber(value)?.country
}

/** National part of an E.164 value, without the `+` and without the dialing code. */
export function nationalDigits(value: string | null): string {
  if (!value) return ''
  const callingCode = parsePhoneNumber(value)?.countryCallingCode
  if (!callingCode) return ''
  return value.slice(callingCode.length + 1)
}

/**
 * The number as a person writes it. The national format comes from the library
 * that formats the field while typing — the same one that validates — and
 * separating the subscriber with a period is the product's: `(85) 99901.3364`.
 * Outside Brazil the country code stays in sight, because without it the number
 * cannot be dialed from here.
 */
export function formatPhoneNumber(value: string | null): string {
  if (!value) return ''
  const parsed = parsePhoneNumber(value)
  if (!parsed) return value
  if (parsed.country !== defaultPhoneCountry) return parsed.formatInternational()
  return parsed.formatNational().replace('-', '.')
}

export interface PhoneNumberSchemaOptions {
  invalidMessage?: string
  requiredMessage?: string
}

/**
 * Phone validation by the same library that formats the field, so the form does
 * not accept a number the input already knows to be incomplete. An optional
 * field composes: `phoneNumberSchema().nullable()`.
 */
export function phoneNumberSchema({
  invalidMessage = 'Informe um telefone válido.',
  requiredMessage = 'Informe um telefone.',
}: PhoneNumberSchemaOptions = {}): z.ZodType<string, string> {
  return z
    .string({ error: requiredMessage })
    .trim()
    .min(1, requiredMessage)
    .refine((value) => isValidPhoneNumber(value), invalidMessage)
}
