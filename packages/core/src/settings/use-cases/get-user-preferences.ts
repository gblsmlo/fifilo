import type { EntityId } from '../../primitives'
import { type Result, ok } from '../../result'
import type { UserPreferencesRepository } from '../ports'
import { DEFAULT_USER_PREFERENCES, type UserPreferences } from '../user-preferences'

export type GetUserPreferencesQuery = {
  organizationId: string
  userId: EntityId
}

export const getUserPreferences = async (
  query: GetUserPreferencesQuery,
  repository: UserPreferencesRepository,
): Promise<Result<UserPreferences, never>> => {
  const existing = await repository.findByUser(query.organizationId, query.userId)

  if (existing) return ok(existing)

  return ok({
    ...DEFAULT_USER_PREFERENCES,
    organizationId: query.organizationId,
    updatedAt: null,
    userId: query.userId,
    version: 0,
  })
}
