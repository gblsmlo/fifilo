import type { FinancialOnboardingStatus } from '@fifilo/core/onboarding'
import { api } from '@libs/api-client'

export async function getOnboardingStatus(): Promise<FinancialOnboardingStatus> {
  const { data, error } = await api.onboarding.get()
  if (error) throw new Error('Não foi possível carregar a configuração financeira.')
  return data
}
