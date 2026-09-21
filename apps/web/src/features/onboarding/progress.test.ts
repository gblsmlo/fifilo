import { describe, expect, test } from 'bun:test'

import { resolveOnboardingProgress } from './progress'

const status = (workspaceSettings: boolean, firstAccount: boolean, complete = false) => ({
  complete,
  steps: { firstAccount, workspaceSettings },
})

describe('resolveOnboardingProgress', () => {
  test('organization creation is the first step', () => {
    expect(resolveOnboardingProgress('/onboarding')).toBe('Passo 1 de 3')
  })

  test('the invitation journey is not a setup step', () => {
    expect(resolveOnboardingProgress('/accept-invitation')).toBe('Convite')
  })

  test('the setup names no step until the status answers', () => {
    expect(resolveOnboardingProgress('/onboarding/setup')).toBe('Configuração inicial')
  })

  test('pending settings is the second step', () => {
    expect(resolveOnboardingProgress('/onboarding/setup', status(false, false))).toBe(
      'Passo 2 de 3',
    )
  })

  test('settings saved and no account yet is the third step', () => {
    expect(resolveOnboardingProgress('/onboarding/setup', status(true, false))).toBe('Passo 3 de 3')
  })

  test('a complete setup names no step at all', () => {
    expect(resolveOnboardingProgress('/onboarding/setup', status(true, true, true))).toBe(
      'Tudo pronto',
    )
  })
})
