import type { CurrencyCode } from '../primitives'

export type WeekStart = 'monday' | 'sunday'

export type WorkspaceSettings = {
  currency: CurrencyCode
  locale: string
  monthStartDay: number
  organizationId: string
  timezone: string
  updatedAt: Date | null
  version: number
  weekStartsOn: WeekStart
}

/**
 * Fases 01-05 read these as hardcoded constants
 * (`DEFAULT_WORKSPACE_CURRENCY`, `DEFAULT_WORKSPACE_TIMEZONE`) with a doc
 * comment on each pointing here. A workspace that never opens Settings still
 * needs a currency, a timezone and a month start, so the row is never
 * required to exist - `getWorkspaceSettings` returns these merged with
 * `version: 0` when nothing has been persisted yet, and `updateWorkspaceSettings`
 * treats `expectedVersion: 0` as "create the row."
 */
export const DEFAULT_WORKSPACE_SETTINGS: Omit<
  WorkspaceSettings,
  'organizationId' | 'updatedAt' | 'version'
> = {
  currency: 'BRL',
  locale: 'pt-BR',
  monthStartDay: 1,
  timezone: 'America/Sao_Paulo',
  weekStartsOn: 'monday',
}

export type WorkspaceSettingsPatch = Partial<
  Omit<WorkspaceSettings, 'organizationId' | 'updatedAt' | 'version'>
>

/** A day past what every month has (Fase 06 § Modelagem never names a bound, but `deriveBillingCycle`'s own clamp for day 29-31 is the precedent: a financial month start needs no such edge case at all). */
export const isValidMonthStartDay = (day: number): boolean =>
  Number.isInteger(day) && day >= 1 && day <= 28
