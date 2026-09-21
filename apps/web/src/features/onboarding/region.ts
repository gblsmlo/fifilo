export const LOCALE_OPTIONS = [
  ['pt-BR', 'Português (Brasil)'],
  ['en-US', 'English (United States)'],
  ['es-ES', 'Español (España)'],
] as const

export const CURRENCY_OPTIONS = [
  ['BRL', 'Real brasileiro (BRL)'],
  ['USD', 'Dólar americano (USD)'],
  ['EUR', 'Euro (EUR)'],
] as const

const FALLBACK_LOCALE = 'pt-BR'
const FALLBACK_TIMEZONE = 'America/Sao_Paulo'

/**
 * The browser's own zone, which is the workspace's zone for the person setting
 * it up. `resolvedOptions()` can answer with a zone this build has no name
 * for, so the caller always adds the detected value to whatever list it
 * offers rather than assuming the catalog contains it.
 */
export const detectTimezone = (): string => {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || FALLBACK_TIMEZONE
  } catch {
    return FALLBACK_TIMEZONE
  }
}

/**
 * Only a locale this product has a name for. A browser set to `pt-PT` gets
 * `pt-BR` rather than a code the workspace cannot label, since the field is a
 * closed list and an unlabeled option is worse than a near match.
 */
export const detectLocale = (): string => {
  const preferred = typeof navigator === 'undefined' ? undefined : navigator.language
  if (!preferred) return FALLBACK_LOCALE

  const exact = LOCALE_OPTIONS.find(([code]) => code === preferred)
  if (exact) return exact[0]

  const language = preferred.split('-')[0]
  return LOCALE_OPTIONS.find(([code]) => code.startsWith(`${language}-`))?.[0] ?? FALLBACK_LOCALE
}

/**
 * Every zone this runtime knows, with the detected one guaranteed to be in it.
 * `supportedValuesOf` is recent enough that a build without it is plausible;
 * there the list is just the detected zone and the default.
 */
export const timezoneOptions = (detected: string): readonly string[] => {
  const supported =
    typeof Intl.supportedValuesOf === 'function' ? Intl.supportedValuesOf('timeZone') : []
  const zones = supported.length > 0 ? supported : [FALLBACK_TIMEZONE]

  return zones.includes(detected) ? zones : [detected, ...zones]
}

export const localeLabel = (locale: string): string =>
  LOCALE_OPTIONS.find(([code]) => code === locale)?.[1] ?? locale

export const currencyLabel = (currency: string): string =>
  CURRENCY_OPTIONS.find(([code]) => code === currency)?.[1] ?? currency
