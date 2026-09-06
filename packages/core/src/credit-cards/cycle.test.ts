import { describe, expect, test } from 'bun:test'

import { deriveBillingCycle } from './cycle'

/**
 * The case table Fase 03 § Critério de conclusão names by name, plus one
 * closing-on-31 case per short month (Fase 03 § Riscos: "dia 31 em mês de
 * 30" is not a single happy case).
 */
describe('deriveBillingCycle', () => {
  test('closing day 31 in a non-leap February clamps to the 28th', () => {
    const cycle = deriveBillingCycle('2025-02-15', 31, 10)
    expect(cycle.periodStart).toBe('2025-02-01')
    expect(cycle.periodEnd).toBe('2025-02-28')
  })

  test('closing day 31 in a leap February clamps to the 29th', () => {
    const cycle = deriveBillingCycle('2024-02-15', 31, 10)
    expect(cycle.periodEnd).toBe('2024-02-29')
  })

  test.each([
    ['2025-04-15', 30],
    ['2025-06-15', 30],
    ['2025-09-15', 30],
    ['2025-11-15', 30],
  ])('closing day 31 in %s clamps to the month`s last day (%i)', (occurredOn, lastDay) => {
    const cycle = deriveBillingCycle(occurredOn, 31, 10)
    expect(cycle.periodEnd.endsWith(String(lastDay))).toBe(true)
  })

  test('a purchase strictly before the closing day belongs to the cycle closing this month', () => {
    const cycle = deriveBillingCycle('2025-06-09', 10, 20)
    expect(cycle.periodStart).toBe('2025-05-11')
    expect(cycle.periodEnd).toBe('2025-06-10')
  })

  test('a purchase on the closing day itself belongs to the next cycle, not this one', () => {
    const cycle = deriveBillingCycle('2025-06-10', 10, 20)
    expect(cycle.periodStart).toBe('2025-06-11')
    expect(cycle.periodEnd).toBe('2025-07-10')
  })

  test('a due day after the closing day falls in the same month as closing', () => {
    const cycle = deriveBillingCycle('2025-06-01', 10, 20)
    expect(cycle.dueOn).toBe('2025-06-20')
  })

  test('a due day before the closing day falls in the month after closing', () => {
    const cycle = deriveBillingCycle('2025-06-01', 25, 10)
    expect(cycle.dueOn).toBe('2025-07-10')
  })

  test('the due day clamps to the month`s last day too', () => {
    const cycle = deriveBillingCycle('2025-01-15', 31, 31)
    // Closing 31 Jan, due day 31 <= closing day 31, so due rolls to February.
    expect(cycle.periodEnd).toBe('2025-01-31')
    expect(cycle.dueOn).toBe('2025-02-28')
  })
})
