import { queryOptions } from '@tanstack/react-query'

import { getUserPreferences } from './http/get-user-preferences'
import { getWorkspaceSettings } from './http/get-workspace-settings'

/**
 * Shared by the route loader's initial prefetch and `useQuery` in the page,
 * so both sides agree on the same `queryKey`/`queryFn` (Decision 007).
 */
export const workspaceSettingsQueryOptions = () =>
  queryOptions({
    queryFn: () => getWorkspaceSettings(),
    queryKey: ['settings', 'workspace'],
  })

export const userPreferencesQueryOptions = () =>
  queryOptions({
    queryFn: () => getUserPreferences(),
    queryKey: ['settings', 'preferences'],
  })
