/** The kind the row holds: it names the label and judges the typed number. */
export type DocumentPropertyKind = 'cnpj' | 'cpf'

/** `0` is a digit; everything else is punctuation, at the position it enters. */
const documentTemplate = {
  cnpj: '00.000.000/0000-00',
  cpf: '000.000.000-00',
} as const satisfies Record<DocumentPropertyKind, string>

export const documentPlaceholder = documentTemplate

export const documentLabel = {
  cnpj: 'CNPJ',
  cpf: 'CPF',
} as const satisfies Record<DocumentPropertyKind, string>

const documentLength = {
  cnpj: 14,
  cpf: 11,
} as const satisfies Record<DocumentPropertyKind, number>

const digitsOf = (value: string): string => value.replaceAll(/\D/g, '')

/** Only the digit count tells the two apart, and it tells them apart on its own. */
export const documentKind = (value: string): DocumentPropertyKind | null => {
  const digits = digitsOf(value)
  if (digits.length === documentLength.cpf) return 'cpf'
  if (digits.length === documentLength.cnpj) return 'cnpj'
  return null
}

/**
 * The punctuation the number gets while it is typed. The format comes from what
 * has already been written, not from the expected document: typing a CNPJ into a
 * CPF row shows a CNPJ and is refused as one, instead of watching the truncated
 * number become a CPF nobody wrote.
 */
export const maskDocument = (value: string): string => {
  const digits = digitsOf(value).slice(0, documentLength.cnpj)
  const template = documentTemplate[digits.length > documentLength.cpf ? 'cnpj' : 'cpf']
  let masked = ''
  let index = 0

  for (const character of template) {
    if (index === digits.length) break
    if (character === '0') {
      masked += digits[index]
      index += 1
    } else {
      masked += character
    }
  }

  return masked
}

/** The refusal, for whoever judges the number outside the property — a schema, say. */
export const documentInvalidMessage = (kind: DocumentPropertyKind): string =>
  `Informe um ${documentLabel[kind]} válido.`

export const documentIssue = (value: string, kind: DocumentPropertyKind): string | null =>
  documentKind(value) === kind ? null : documentInvalidMessage(kind)
