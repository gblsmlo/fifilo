import type {
  AccountBalanceSeries,
  AccountSpendRow,
  AnalyticsReader,
  BalancePoint,
  CategorySpendRow,
  MonthlyCashflowPoint,
  TopExpenseRow,
} from '../ports'

export type FakeAnalyticsFixtures = {
  balanceEvolution?: { accounts: AccountBalanceSeries[]; consolidated: BalancePoint[] }
  consolidatedBalance?: { availableCashMinor: number; committedInvoiceMinor: number }
  monthlyCashflow?: MonthlyCashflowPoint[]
  spendByAccount?: AccountSpendRow[]
  spendByCategory?: CategorySpendRow[]
  topExpenses?: TopExpenseRow[]
}

/** An in-memory stand-in for the Drizzle adapter, shared by this folder's tests. */
export const createFakeAnalyticsReader = (
  fixtures: FakeAnalyticsFixtures = {},
): AnalyticsReader => ({
  async balanceEvolution() {
    return fixtures.balanceEvolution ?? { accounts: [], consolidated: [] }
  },
  async consolidatedBalance() {
    return fixtures.consolidatedBalance ?? { availableCashMinor: 0, committedInvoiceMinor: 0 }
  },
  async monthlyCashflow() {
    return fixtures.monthlyCashflow ?? []
  },
  async spendByAccount() {
    return fixtures.spendByAccount ?? []
  },
  async spendByCategory() {
    return fixtures.spendByCategory ?? []
  },
  async topExpenses() {
    return fixtures.topExpenses ?? []
  },
})
