import type { FinancialOnboardingProgressRepository } from '@fifilo/core/onboarding'

import { createFinancialOnboardingProgressRepository } from './onboarding-persistence'

export const createOnboardingRepository = (): FinancialOnboardingProgressRepository =>
  createFinancialOnboardingProgressRepository()
