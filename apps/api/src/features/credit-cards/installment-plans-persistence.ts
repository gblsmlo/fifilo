import type {
  InstallmentPlanRepository,
  InstallmentTransactionShare,
  NewInstallmentPlanRecord,
} from '@fifilo/core/credit-cards'
import type { EntityId } from '@fifilo/core/primitives'
import { generateEntityId } from '@fifilo/core/primitives'
import { entries, installmentPlans, transactions } from '@fifilo/infra-database/schema'
import { withWorkspaceTransaction } from '@fifilo/infra-database/workspace'

/**
 * The plan row, every installment transaction and every one of its entries
 * are written in the same database transaction (Fase 03 § Modelagem: an
 * installment that fails halfway must never leave a gap in the numbering,
 * the same guarantee `create-transaction`'s own leg write already gives a
 * transfer).
 */
const createInstallmentPlanWithTransactions = async (
  plan: NewInstallmentPlanRecord,
  shares: readonly InstallmentTransactionShare[],
): Promise<EntityId[]> =>
  withWorkspaceTransaction(plan.organizationId, async (tx) => {
    await tx.insert(installmentPlans).values({
      categoryId: plan.categoryId,
      createdAt: plan.createdAt,
      createdBy: plan.createdBy,
      description: plan.description,
      firstOccurredOn: plan.firstOccurredOn,
      id: plan.id,
      installments: plan.installments,
      notes: plan.notes,
      organizationId: plan.organizationId,
      totalMinor: plan.totalMinor,
      updatedAt: plan.createdAt,
    })

    const transactionIds = shares.map(() => generateEntityId())

    if (shares.length > 0) {
      await tx.insert(transactions).values(
        shares.map((share, index) => ({
          categoryId: plan.categoryId,
          createdAt: plan.createdAt,
          createdBy: plan.createdBy,
          description: plan.description,
          id: transactionIds[index] as EntityId,
          installmentNumber: share.installmentNumber,
          installmentPlanId: plan.id,
          kind: 'expense' as const,
          notes: plan.notes,
          occurredOn: share.occurredOn,
          organizationId: plan.organizationId,
          updatedAt: plan.createdAt,
        })),
      )

      await tx.insert(entries).values(
        shares.map((share, index) => ({
          accountId: share.accountId,
          amountMinor: share.amountMinor,
          currency: share.currency,
          id: generateEntityId(),
          invoiceId: share.invoiceId,
          occurredOn: share.occurredOn,
          organizationId: plan.organizationId,
          transactionId: transactionIds[index] as EntityId,
        })),
      )
    }

    return transactionIds
  })

export const createInstallmentPlansRepository = (): InstallmentPlanRepository => ({
  createWithTransactions: createInstallmentPlanWithTransactions,
})
