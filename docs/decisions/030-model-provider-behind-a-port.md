# Decision 030: the model provider sits behind a port; the product never implements an agent loop

## Status

Active. Recorded on 2026-09-07 for the Fifilo product domain. Executed in
[Fase 07](../plans/fifilo/fase-07-fundacao-de-ia.md).

## Context

Fase 07 § "A lição central da referência" names the source of this decision
directly: [Multica](https://dev.to/truongpx396/multica-deep-dive-how-to-build-a-managed-agents-platform-54l2)'s
own summary of its architecture is "don't build the agent loop, wrap it." A
model provider's SDK already runs the loop (a request, a stream of events, a
terminal state); the risk this starter's own delivery pattern names
repeatedly (Decision 001's capability-behind-a-port, Decision 003's
composition roots) is a product that instead re-derives that loop per
provider, coupling every consumer - Fase 08's chat, Fase 09's insights - to
one SDK's own event shapes.

## Options considered

1. **Call the Anthropic SDK (or OpenRouter's REST API) directly from every
   consumer that needs a model response.** Fastest for the first call site;
   every later one repeats the same streaming-event parsing, and switching
   or adding a provider means touching every call site instead of one file.
2. **One port, `AgentBackend`, with a message taxonomy every adapter
   normalizes its provider's own stream into.** `packages/ai` owns the
   taxonomy (`text`, `thinking`, `tool-use`, `tool-result`, `status`,
   `error`) and one file per provider; nothing outside `packages/ai` ever
   sees a raw Anthropic or OpenRouter event.

## Decision

Adopt option 2. `AgentBackend.run(input, options): AsyncIterable<AgentMessage>`
is the one interface `packages/ai`'s adapters implement -
`anthropic-backend.ts`, `openrouter-backend.ts`, and `stub-backend.ts` for a
network-free, deterministic fixture every contract test and Fase 08 fixture
uses instead of a live provider. `packages/ai` imports nothing from
`packages/infra/database`, `packages/auth` or Elysia (Decision 001): it
receives whatever capability it needs as a constructor argument (an API
key), never reaches for one itself.

### The guardrails wrap the port, not each adapter

`withRequiredContext`, `withTimeout` and `capErrorBuffer`
(`packages/ai/src/guardrails.ts`) apply to any `AgentBackend`, composed once
as `withGuardrails` and applied at each adapter's own factory
(`createAnthropicBackend`, `createOpenRouterBackend`, `createStubBackend`).
A future adapter gets every guardrail by construction, not by remembering to
repeat them.

## Consequences

- Fase 08's chat surface (and Fase 09's insights) call `AgentBackend.run`
  and read `AgentMessage`, never an Anthropic or OpenRouter type - trading
  one provider for another, or adding a third, is a new file behind the same
  port, not a change to any consumer.
- `runBackendContract` (`packages/ai/src/contract.ts`) is the one test suite
  every adapter passes - the context-refusal assertion always runs, the
  live-call assertion skips when a provider's key is absent rather than
  failing the whole suite for a paid third-party service nothing else in
  this repo requires to boot.
- Mapping a provider's own wire format (`mapAnthropicEvent`, OpenRouter's SSE
  parsing and tool-call accumulation) is a pure function tested against
  synthetic, documented-shape events or a mocked transport - the network
  call itself is the one part still owed a live smoke test once a key
  exists.

## Revisit when

- A third provider earns the same explicit reason Decision 031 requires for
  Anthropic and OpenRouter - the port's existence is what makes that cheap,
  not a reason to add one speculatively.
- `AgentMessage`'s taxonomy stops covering a real provider capability (a
  citation, a multi-turn tool loop shape neither Anthropic nor OpenRouter
  expose today) - extend the union, not the port's own method signature.

## Related

- [`docs/decisions/README.md`](README.md) resolves number → file → state.
- Decision 001: a capability behind a port, never `Bun.env` or a concrete
  SDK reached for directly outside its own adapter.
- Decision 003: `repository.ts` is a composition root - `apps/api/src/features/ai/repository.ts`
  follows the same shape for `AiRunRepository`/`AiBudgetRepository`/`AiKillSwitchRepository`.
- Decision 031: why Anthropic API and OpenRouter both ship as the initial
  adapters instead of one now, one later.
- Decision 032: the redaction gate this port's guardrails compose with
  before any input reaches a provider.
