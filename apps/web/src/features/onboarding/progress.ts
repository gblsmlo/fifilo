import type { FinancialOnboardingStatus } from '@fifilo/core/onboarding'

const TOTAL_STEPS = 3

/**
 * What the onboarding shell says above the current card. Derived from where
 * the person is and from the status that already decides the step, so the
 * label cannot drift from the card being shown.
 */
export const resolveOnboardingProgress = (
  pathname: string,
  status?: Pick<FinancialOnboardingStatus, 'complete' | 'steps'>,
): string => {
  if (pathname.startsWith('/accept-invitation')) return 'Convite'
  if (!pathname.startsWith('/onboarding/setup')) return `Passo 1 de ${TOTAL_STEPS}`
  if (!status) return 'Configuração inicial'
  if (status.complete) return 'Tudo pronto'
  if (!status.steps.workspaceSettings) return `Passo 2 de ${TOTAL_STEPS}`
  return `Passo 3 de ${TOTAL_STEPS}`
}
