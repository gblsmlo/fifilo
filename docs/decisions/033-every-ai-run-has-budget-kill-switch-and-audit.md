# Decision 033: every AI execution carries a budget check, a kill-switch check and an audit trail

## Status

Active. Recorded on 2026-09-07 for the Fifilo product domain. Executed in
[Fase 07](../plans/fifilo/fase-07-fundacao-de-ia.md).

## Context

Fase 07 § Guardrails #3 and #4 name the two failure modes a cost-bearing,
externally-callable capability invites once it exists: "sem limite, um laço
com defeito vira fatura," and no way to turn the whole capability off
without redeploying. Fase 07 § Objetivo states the ordering this decision
protects: "custo, limite, auditoria... vêm antes da primeira resposta
gerada - depois que existe usuário esperando, nenhum desses vira
prioridade." Building the guard after the first real caller exists is
building it under pressure not to slow that caller down.

## Options considered

1. **Add budget and kill-switch enforcement once Fase 08's chat surface
   ships**, informed by real usage patterns. Defers the two controls to
   exactly the moment a real user is waiting on a response, the moment Fase
   07's own objective says makes them hardest to prioritize honestly.
2. **Build and test the guard chain now, against a stub backend, before any
   real caller exists.** `guardAiRun` (`apps/api/src/features/ai/guard-run.ts`)
   composes `checkKillSwitch` then `checkBudget` (Core use cases over their
   own ports) into the one call a future chat route makes before
   constructing an `AgentBackend` at all.

## Decision

Adopt option 2. Three tables carry the state these checks read:
`ai_workspace_kill_switches` (one row per workspace, lazily materialized
like `workspace_settings`), `ai_global_kill_switch` (a single row, no
`organization_id`, no RLS - not tenant data, the same reason `organizations`
itself carries none), and `ai_budgets` (`(organization_id, period)`,
`limit_minor` nullable by design: a workspace with no configured limit is
tracked, not blocked). `ai_runs` records the outcome of every execution -
provider, model, token counts, cost in minor units through the same `Money`
primitive every other financial fact in this codebase uses, and status.

### Global is checked before workspace

`checkKillSwitch` checks the global switch first: it is the cheaper read and
the one most likely to answer "no" for every workspace at once, so it
short-circuits before a workspace-specific lookup ever runs.

### A budget can only refuse the *next* call, never retroactively decline the current one

Token cost is unknowable before a provider's response completes.
`checkBudget` only ever answers whether a period is *already* exhausted;
`recordSpend` never refuses - it records whatever the just-finished call
actually cost, even past the limit, because that cost already happened.
The limit's enforcement is entirely in the next `checkBudget` call, not in
`recordSpend`.

## Consequences

- Fase 08's chat route calls `guardAiRun` once, before building any
  `AgentBackend` - a killed workspace or an exhausted budget never reaches a
  provider call in the first place, not merely fails one already in flight.
- `requireAiBudgetWriteAccess` and `requireAiKillSwitchAccess`
  (`packages/core/src/access-control.ts`) share the same owner-or-admin
  predicate `requireSettingsWriteAccess` and `requireExportAccess` already
  established - no route calls them yet (Fase 07 ships no visible
  functionality), but the use cases that will need them are ready and
  tested.
- `guardrail-evidence.test.ts` proves the chain against the stub backend
  end to end: guard, redact, run, finish, record spend - and that turning
  the kill switch on mid-session blocks the very next guard check while
  every other guarded surface keeps answering normally, not just that each
  piece works in isolation.
- `ai_runs` and `ai_budgets` get the standard `FORCE` RLS and organization
  policy (Decision 020); `ai_workspace_kill_switches` follows suit.

## Revisit when

- A route actually exposes budget or kill-switch changes to a user (an
  admin surface, Fase 08 onward) - the use cases and their access control
  already exist; only the HTTP adapter and its audit-event emission at that
  layer are new work then.
- The global kill switch needs to answer faster than a database round trip
  allows (a hot path serving many workspaces at once) - an in-memory cache
  with a short TTL becomes the cheaper design then, not a premature one now.

## Related

- [`docs/decisions/README.md`](README.md) resolves number → file → state.
- Decision 017: money is an integer in minor units - `ai_runs.cost_minor`
  and `ai_budgets.limit_minor`/`consumed_minor` follow it.
- Decision 020: RLS with `FORCE`, and five negative proofs before exposure -
  `ai_runs` and `ai_budgets`' own integration suite follows the same
  contract `workspace_settings` and `user_preferences` established.
- Decision 026: authorization decided in the use case - the same pattern
  `requireAiBudgetWriteAccess`/`requireAiKillSwitchAccess` extend.
- Decision 030: the port `guardAiRun` gates access to.
