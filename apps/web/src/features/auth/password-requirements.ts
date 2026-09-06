import type { PasswordRequirement } from '@twincam/patterns/password-strength'

export const PASSWORD_MIN_LENGTH = 12

/**
 * Só o comprimento reprova: é a única regra em `signUpRequestSchema`, e o schema
 * é o contrato que a API também valida. As outras três linhas são as que a tela
 * sempre prometeu ("Combine letras, números e um símbolo") e seguem como
 * recomendação — torná-las obrigatórias muda a política de senha e precisa passar
 * por produto antes de mudar o contrato.
 */
export function passwordRequirements(password: string): PasswordRequirement[] {
  return [
    { label: `${PASSWORD_MIN_LENGTH} caracteres`, met: password.length >= PASSWORD_MIN_LENGTH },
    { label: 'Letras', met: /\p{L}/u.test(password) },
    { label: 'Números', met: /\p{N}/u.test(password) },
    { label: 'Símbolo', met: /[^\p{L}\p{N}\s]/u.test(password) },
  ]
}
