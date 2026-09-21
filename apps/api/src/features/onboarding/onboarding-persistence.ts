import type {
  FinancialOnboardingProgress,
  FinancialOnboardingProgressRepository,
} from '@fifilo/core/onboarding'
import { financialOnboardingProgress } from '@fifilo/infra-database/schema'
import { withActorWorkspaceTransaction } from '@fifilo/infra-database/workspace'
import { and, eq, sql } from 'drizzle-orm'

const findByUser = async (
  organizationId: string,
  userId: string,
): Promise<FinancialOnboardingProgress | null> =>
  withActorWorkspaceTransaction(organizationId, userId, async (tx) => {
    const [row] = await tx
      .select()
      .from(financialOnboardingProgress)
      .where(
        and(
          eq(financialOnboardingProgress.organizationId, organizationId),
          eq(financialOnboardingProgress.userId, userId),
        ),
      )
      .limit(1)

    return row
      ? {
          dismissedAt: row.dismissedAt,
          organizationId: row.organizationId,
          userId: row.userId,
        }
      : null
  })

const dismiss = async (organizationId: string, userId: string): Promise<void> => {
  await withActorWorkspaceTransaction(organizationId, userId, async (tx) => {
    await tx
      .update(financialOnboardingProgress)
      .set({ dismissedAt: sql`now()`, updatedAt: sql`now()` })
      .where(
        and(
          eq(financialOnboardingProgress.organizationId, organizationId),
          eq(financialOnboardingProgress.userId, userId),
        ),
      )
  })
}

/**
 * `onConflictDoNothing` rather than an upsert: an existing row carries the
 * owner's `dismissedAt`, and repairing a missing row must never undo a
 * deferral the person made.
 */
const ensure = async (organizationId: string, userId: string): Promise<void> => {
  await withActorWorkspaceTransaction(organizationId, userId, async (tx) => {
    await tx
      .insert(financialOnboardingProgress)
      .values({ organizationId, userId })
      .onConflictDoNothing({
        target: [financialOnboardingProgress.organizationId, financialOnboardingProgress.userId],
      })
  })
}

export const createFinancialOnboardingProgressRepository =
  (): FinancialOnboardingProgressRepository => ({
    dismiss,
    ensure,
    findByUser,
  })
