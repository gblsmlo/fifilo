import { describe, expect, test } from 'bun:test'
import { signUpRequestSchema } from '@twincam/core/contracts/auth'
import { PASSWORD_MIN_LENGTH, passwordRequirements } from './password-requirements'

const met = (password: string) =>
  passwordRequirements(password)
    .filter((requirement) => requirement.met)
    .map((requirement) => requirement.label)

describe('@auth password requirements', () => {
  test('reports nothing met for an empty password', () => {
    expect(met('')).toEqual([])
  })

  test('separates length from the character classes', () => {
    expect(met('abcdefghijkl')).toEqual([`${PASSWORD_MIN_LENGTH} caracteres`, 'Letras'])
    expect(met('Ab1!')).toEqual(['Letras', 'Números', 'Símbolo'])
  })

  test('reports every requirement met for a strong password', () => {
    expect(met('seed-office-demo-123')).toEqual([
      `${PASSWORD_MIN_LENGTH} caracteres`,
      'Letras',
      'Números',
      'Símbolo',
    ])
  })

  test('keeps the length rule in sync with the contract that actually blocks', () => {
    // As outras três linhas são recomendação: o contrato aceita uma senha longa
    // sem número nem símbolo, e o medidor não pode sugerir o contrário.
    expect(
      signUpRequestSchema.safeParse({
        email: 'ana@example.com',
        name: 'Ana',
        password: 'a'.repeat(PASSWORD_MIN_LENGTH),
      }).success,
    ).toBe(true)
    expect(
      signUpRequestSchema.safeParse({
        email: 'ana@example.com',
        name: 'Ana',
        password: 'a'.repeat(PASSWORD_MIN_LENGTH - 1),
      }).success,
    ).toBe(false)
  })
})
