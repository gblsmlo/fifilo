import type { CurrencyCode } from '../primitives'

/**
 * `period` is a billing-period label (`YYYY-MM`) - the vendor's bill does
 * not follow `workspace_settings.monthStartDay`. `limitMinor: null` is a
 * valid, named state (Fase 07 § Guardrails #3): spend is tracked with no
 * cap enforced.
 */
export type AiBudget = {
  consumedMinor: number
  currency: CurrencyCode
  limitMinor: number | null
  organizationId: string
  period: string
  version: number
}

export type AiBudgetPatch = {
  currency: CurrencyCode
  limitMinor: number | null
}
