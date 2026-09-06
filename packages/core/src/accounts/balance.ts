import type { EntityId } from '../primitives'
import { type CurrencyCode, type Money, type MoneyError, add, money } from '../primitives'
import type { Result } from '../result'

export type AccountBalance = {
  accountId: EntityId
  balance: Money
}

/**
 * Every account shares the workspace currency in Fase 01 (Decision 017),
 * so a consolidated balance is one running sum, not a per-currency map.
 * Reuses `add`'s own overflow check instead of a second one over raw numbers.
 */
export const consolidateBalances = (
  balances: readonly Money[],
  currency: CurrencyCode,
): Result<Money, MoneyError> =>
  balances.reduce<Result<Money, MoneyError>>(
    (total, balance) => (total.ok ? add(total.value, balance) : total),
    money(0, currency),
  )
