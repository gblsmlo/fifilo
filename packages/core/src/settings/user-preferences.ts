import type { EntityId } from '../primitives'

export type Theme = 'dark' | 'light' | 'system'
export type Density = 'comfortable' | 'compact'

/**
 * Keyed by `(organizationId, userId)`, never `userId` alone (Fase 06 §
 * Modelagem): the same person can prefer a compact table in one workspace
 * and a comfortable one in another.
 */
export type UserPreferences = {
  density: Density
  notifyByEmail: boolean
  organizationId: string
  theme: Theme
  updatedAt: Date | null
  userId: EntityId
  version: number
}

export const DEFAULT_USER_PREFERENCES: Omit<
  UserPreferences,
  'organizationId' | 'updatedAt' | 'userId' | 'version'
> = {
  density: 'comfortable',
  notifyByEmail: true,
  theme: 'system',
}

export type UserPreferencesPatch = Partial<
  Omit<UserPreferences, 'organizationId' | 'updatedAt' | 'userId' | 'version'>
>
