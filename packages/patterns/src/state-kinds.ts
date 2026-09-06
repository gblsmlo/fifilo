/**
 * Distinct surface state kinds. Each kind maps to a specific copy and visual
 * treatment so surfaces never collapse distinct failures into a generic
 * message.
 */
export type StateSurfaceKind =
  | 'empty'
  | 'no-result'
  | 'integration-disconnected'
  | 'sync-pending'
  | 'error'
  | 'permission'

// `loading` stays a guard-only state, not a StateSurfaceKind: it is transient
// and Coss documents using the Empty-composed surface for it as a pitfall —
// StateGuard renders it with a lighter, dedicated treatment instead.
export type SurfaceGuardState = 'data' | 'loading' | StateSurfaceKind

/**
 * Maps a generic error code string to a surface kind. Permission codes never
 * fall through to a generic error so the UI never confuses access denial with
 * a recoverable failure.
 */
export function errorCodeToSurfaceKind(
  errorCode: string | undefined,
): Extract<StateSurfaceKind, 'error' | 'permission'> {
  if (errorCode === undefined) {
    return 'error'
  }
  if (
    errorCode === 'permission_denied' ||
    errorCode === 'forbidden' ||
    errorCode === 'unauthorized'
  ) {
    return 'permission'
  }
  return 'error'
}
