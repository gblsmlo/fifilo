import { queryOptions } from '@tanstack/react-query'

import { getOnboardingStatus } from './http/get-onboarding-status'

export const onboardingStatusQueryOptions = () =>
  queryOptions({
    queryFn: getOnboardingStatus,
    queryKey: ['onboarding'],
  })
