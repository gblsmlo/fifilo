/**
 * The institutions a workspace is likely to name, so a row can be recognized
 * by its colour before it is read.
 *
 * `institution` is free text in the contract, so an entry is matched by name:
 * `aliases` carries the spellings people actually type. A logo library keys on
 * ISPB or COMPE instead, never on a name, so `compe` is what an account would
 * have to start carrying for one to be wired in.
 */
export interface Institution {
  /** Two letters for the avatar when no logo is available. */
  abbreviation: string
  /** Other spellings that resolve to this entry, lowercased and unaccented. */
  aliases: readonly string[]
  /** The institution's public brand colour, used as the avatar background. */
  brandColor: string
  id: string
  name: string
}

export const institutions: readonly Institution[] = [
  {
    abbreviation: 'BB',
    aliases: ['banco do brasil', 'bb'],
    brandColor: '#003399',
    id: 'banco-do-brasil',
    name: 'Banco do Brasil',
  },
  {
    abbreviation: 'BR',
    aliases: ['bradesco', 'banco bradesco'],
    brandColor: '#CC092F',
    id: 'bradesco',
    name: 'Bradesco',
  },
  {
    abbreviation: 'BT',
    aliases: ['btg', 'btg pactual', 'banco btg pactual'],
    brandColor: '#0D1B2A',
    id: 'btg-pactual',
    name: 'BTG Pactual',
  },
  {
    abbreviation: 'C6',
    aliases: ['c6', 'c6 bank', 'banco c6'],
    brandColor: '#242424',
    id: 'c6-bank',
    name: 'C6 Bank',
  },
  {
    abbreviation: 'CX',
    aliases: ['caixa', 'caixa economica federal', 'cef'],
    brandColor: '#1C5CA6',
    id: 'caixa',
    name: 'Caixa Econômica Federal',
  },
  {
    abbreviation: 'IN',
    aliases: ['inter', 'banco inter'],
    brandColor: '#FF7A00',
    id: 'inter',
    name: 'Banco Inter',
  },
  {
    abbreviation: 'IT',
    aliases: ['itau', 'itau unibanco', 'banco itau'],
    brandColor: '#EC7000',
    id: 'itau',
    name: 'Itaú',
  },
  {
    abbreviation: 'MP',
    aliases: ['mercado pago', 'mercadopago'],
    brandColor: '#009EE3',
    id: 'mercado-pago',
    name: 'Mercado Pago',
  },
  {
    abbreviation: 'NB',
    aliases: ['nubank', 'nu', 'nu pagamentos'],
    brandColor: '#820AD1',
    id: 'nubank',
    name: 'Nubank',
  },
  {
    abbreviation: 'PB',
    aliases: ['pagbank', 'pagseguro'],
    brandColor: '#0FA958',
    id: 'pagbank',
    name: 'PagBank',
  },
  {
    abbreviation: 'PP',
    aliases: ['picpay'],
    brandColor: '#21C25E',
    id: 'picpay',
    name: 'PicPay',
  },
  {
    abbreviation: 'SA',
    aliases: ['santander', 'banco santander'],
    brandColor: '#EC0000',
    id: 'santander',
    name: 'Santander',
  },
  {
    abbreviation: 'SI',
    aliases: ['sicoob'],
    brandColor: '#00AE9D',
    id: 'sicoob',
    name: 'Sicoob',
  },
  {
    abbreviation: 'SC',
    aliases: ['sicredi'],
    brandColor: '#3FA110',
    id: 'sicredi',
    name: 'Sicredi',
  },
  {
    abbreviation: 'XP',
    aliases: ['xp', 'xp investimentos', 'xp inc'],
    brandColor: '#0D0D0D',
    id: 'xp',
    name: 'XP',
  },
]

const normalize = (value: string): string =>
  value
    .normalize('NFD')
    // Strip the combining marks the decomposition leaves behind, so "Itaú" and
    // "itau" are the same key.
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim()

const institutionByAlias = new Map(
  institutions.flatMap((institution) => [
    [normalize(institution.name), institution] as const,
    ...institution.aliases.map((alias) => [normalize(alias), institution] as const),
  ]),
)

/** `null` when the workspace typed an institution the catalog does not know. */
export const resolveInstitution = (institution: string | null): Institution | null =>
  institution ? (institutionByAlias.get(normalize(institution)) ?? null) : null

/** The first letters of the account's own name, for an institution with no entry. */
export const accountInitials = (name: string): string =>
  name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((word) => word[0] ?? '')
    .join('')
    .toUpperCase() || '—'
