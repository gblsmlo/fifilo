import { api } from '@libs/api-client'

/**
 * Makes the workspace ready for the setup journey: the owner's progress row,
 * which the creation hook writes only on a best-effort basis (`BUG-003`), and
 * the default category set (Decision 036).
 *
 * Idempotent, so the caller runs it on every entry instead of tracking whether
 * it has run. It never throws: the setup stays usable without it, and the next
 * entry tries again.
 */
export async function startOnboarding(): Promise<number> {
  try {
    const { data } = await api.onboarding.start.post()
    return data?.seeded ?? 0
  } catch {
    return 0
  }
}
