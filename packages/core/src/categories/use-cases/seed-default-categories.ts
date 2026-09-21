import { type WorkspaceRole, requireFinancialOnboardingAccess } from '../../access-control'
import { forbiddenError } from '../../errors'
import { type Result, err, ok } from '../../result'
import { buildDefaultCategories } from '../default-set'
import type { CategoryRepository } from '../ports'

export type SeedDefaultCategoriesCommand = {
  organizationId: string
  role: WorkspaceRole
}

export type SeedDefaultCategoriesError = ReturnType<typeof forbiddenError<'insufficient_role'>>

/**
 * Idempotent on purpose: the caller runs it on every entry to the onboarding
 * setup, so a workspace that lost the write once repairs itself on the next
 * visit. A workspace that already has any category — archived included — is
 * one that has been set up, and gets nothing.
 */
export const seedDefaultCategories = async (
  command: SeedDefaultCategoriesCommand,
  repository: Pick<CategoryRepository, 'createMany' | 'list'>,
): Promise<Result<number, SeedDefaultCategoriesError>> => {
  if (!requireFinancialOnboardingAccess(command.role)) {
    return err(
      forbiddenError('insufficient_role', 'Only the workspace owner can seed the categories.'),
    )
  }

  const existing = await repository.list(command.organizationId, { includeArchived: true })
  if (existing.length > 0) return ok(0)

  const seeded = await repository.createMany(buildDefaultCategories(command.organizationId))
  return ok(seeded)
}
