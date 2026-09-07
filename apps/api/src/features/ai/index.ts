/**
 * No routes yet (Fase 07 § Objetivo: "nenhuma funcionalidade visível") -
 * this barrel exists so Fase 08 onward wires a route through the same
 * composition root every other feature uses, instead of reaching into
 * `*-persistence.ts` directly.
 */
export {
  createAiBudgetRepository,
  createAiKillSwitchRepository,
  createAiRunRepository,
} from './repository'
