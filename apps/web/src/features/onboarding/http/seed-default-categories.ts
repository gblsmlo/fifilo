import { api } from '@libs/api-client'

/**
 * Idempotent, so the caller runs it on every entry to the setup instead of
 * tracking whether it has run. It never throws: the account step stays usable
 * without categories, and the next entry tries again.
 */
export async function seedDefaultCategories(): Promise<number> {
  try {
    const { data } = await api.onboarding.categories.post()
    return data?.seeded ?? 0
  } catch {
    return 0
  }
}
