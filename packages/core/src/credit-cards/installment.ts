import { type Money, type MoneyError, allocate } from '../primitives'
import { type Result, map } from '../result'
import { addCalendarMonths } from './cycle'

export type InstallmentShare = {
  amountMinor: number
  installmentNumber: number
  occurredOn: string
}

/**
 * One purchase becomes `parts` expenses, one per consecutive cycle (Fase 03 §
 * Modelagem): `allocate` guarantees the shares sum back to the total - R$ 100
 * in 3 is 34/33/33, never `total / n` rounded three times - and each share's
 * date lands one calendar month further than the last, so
 * `resolveInvoiceForOccurrence` places it in the next invoice on its own.
 */
export const buildInstallmentShares = (
  total: Money,
  parts: number,
  firstOccurredOn: string,
): Result<InstallmentShare[], MoneyError> =>
  map(allocate(total, parts), (shares) =>
    shares.map((share, index) => ({
      amountMinor: share.amountMinor,
      installmentNumber: index + 1,
      occurredOn: addCalendarMonths(firstOccurredOn, index),
    })),
  )
