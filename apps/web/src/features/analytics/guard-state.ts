import { errorCodeToSurfaceKind } from '@fifilo/patterns/state-kinds'
import type { SurfaceGuardState } from '@fifilo/patterns/state-surface'

import { AnalyticsRequestError } from './http/errors'

export interface AnalyticsQueryLike {
  error: unknown
  isError: boolean
  isPending: boolean
}

/**
 * Maps a TanStack Query result to the state every chart section's
 * `StateGuard` needs, so the same four branches (loading, error, empty,
 * data) are not hand-rolled per section.
 */
export const queryGuardState = (query: AnalyticsQueryLike, isEmpty: boolean): SurfaceGuardState => {
  if (query.isPending) return 'loading'
  if (query.isError) {
    const code = query.error instanceof AnalyticsRequestError ? query.error.code : undefined
    return errorCodeToSurfaceKind(code)
  }
  if (isEmpty) return 'empty'
  return 'data'
}

export const queryErrorMessage = (error: unknown, fallback: string): string =>
  error instanceof AnalyticsRequestError ? error.message : fallback
