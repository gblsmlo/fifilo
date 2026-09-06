import type { CurrencyCode } from '@fifilo/core/primitives'
import { currencyExponent } from '@fifilo/core/primitives'

/**
 * Display only: the integer is divided for presentation and never fed back
 * into a calculation (Decision 017). The exponent comes from the same table
 * `Money`'s own arithmetic reads, never assumed to be 2.
 */
export const formatMoney = (money: { amountMinor: number; currency: CurrencyCode }): string => {
  const amount = money.amountMinor / 10 ** currencyExponent(money.currency)
  return new Intl.NumberFormat('pt-BR', { currency: money.currency, style: 'currency' }).format(
    amount,
  )
}
