import { describe, expect, test } from 'bun:test'
import { documentIssue, documentKind, maskDocument } from './document-mask'

describe('document-mask', () => {
  test('punctuates the CPF while it is typed', () => {
    expect(maskDocument('529')).toBe('529')
    expect(maskDocument('5299')).toBe('529.9')
    expect(maskDocument('52998224725')).toBe('529.982.247-25')
  })

  test('punctuates the CNPJ while it is typed', () => {
    expect(maskDocument('11')).toBe('11')
    expect(maskDocument('112223330001')).toBe('11.222.333/0001')
    expect(maskDocument('11222333000181')).toBe('11.222.333/0001-81')
  })

  // The format comes from what has already been typed: truncating at 11 digits
  // would turn a CNPJ typed by mistake into a CPF nobody wrote, and it would pass.
  test('the twelfth digit reflows the number into the CNPJ format', () => {
    expect(maskDocument('11222333000')).toBe('112.223.330-00')
    expect(maskDocument('112223330000')).toBe('11.222.333/0000')
  })

  test('drops what is not a digit and stops at the CNPJ length', () => {
    expect(maskDocument('529.982.247-25')).toBe('529.982.247-25')
    expect(maskDocument('11222333000181999')).toBe('11.222.333/0001-81')
  })

  test('the document is recognized by its digit count', () => {
    expect(documentKind('529.982.247-25')).toBe('cpf')
    expect(documentKind('11.222.333/0001-81')).toBe('cnpj')
    expect(documentKind('•••.•••.•••-09')).toBeNull()
    expect(documentKind('529.982.247')).toBeNull()
  })

  test('a number that is not the expected document is refused by its name', () => {
    expect(documentIssue('529.982.247-25', 'cpf')).toBeNull()
    expect(documentIssue('11.222.333/0001-81', 'cpf')).toBe('Informe um CPF válido.')
    expect(documentIssue('529.982.247-25', 'cnpj')).toBe('Informe um CNPJ válido.')
  })
})
