import { generateEntityId } from '../../primitives'
import type {
  InstallmentPlanRepository,
  InstallmentTransactionShare,
  NewInstallmentPlanRecord,
} from '../ports'

/** An in-memory stand-in for the Drizzle adapter, shared by this folder's tests. */
export const createFakeInstallmentPlanRepository = (): InstallmentPlanRepository & {
  plans: NewInstallmentPlanRecord[]
  sharesByPlanId: Map<string, InstallmentTransactionShare[]>
} => {
  const plans: NewInstallmentPlanRecord[] = []
  const sharesByPlanId = new Map<string, InstallmentTransactionShare[]>()

  return {
    plans,
    sharesByPlanId,

    async createWithTransactions(plan, shares) {
      plans.push(plan)
      sharesByPlanId.set(plan.id, [...shares])
      return shares.map(() => generateEntityId())
    },
  }
}
